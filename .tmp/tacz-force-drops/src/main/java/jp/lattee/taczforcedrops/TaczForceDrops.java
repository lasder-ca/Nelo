package jp.lattee.taczforcedrops;

import com.mojang.logging.LogUtils;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.tags.TagKey;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.damagesource.DamageType;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.item.ItemEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.storage.loot.LootParams;
import net.minecraft.world.level.storage.loot.LootTable;
import net.minecraft.world.level.storage.loot.parameters.LootContextParamSets;
import net.minecraft.world.level.storage.loot.parameters.LootContextParams;
import net.minecraftforge.common.MinecraftForge;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.event.entity.living.LivingDeathEvent;
import net.minecraftforge.event.entity.living.LivingDropsEvent;
import net.minecraftforge.eventbus.api.EventPriority;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;
import org.slf4j.Logger;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Mod(TaczForceDrops.MOD_ID)
public final class TaczForceDrops {
    public static final String MOD_ID = "tacz_force_drops";
    private static final Logger LOGGER = LogUtils.getLogger();

    public TaczForceDrops() {
        MinecraftForge.EVENT_BUS.register(DropHandler.class);
        LOGGER.info("TaCZ Force Drops loaded");
    }

    private static final class DropHandler {
        private static final TagKey<DamageType> TACZ_BULLETS = TagKey.create(
            Registries.DAMAGE_TYPE,
            new ResourceLocation("tacz", "bullets")
        );
        private static final int MAX_ROLL_ATTEMPTS = 4;
        private static final Map<UUID, PendingDrop> PENDING = new ConcurrentHashMap<>();

        private DropHandler() {
        }

        @SubscribeEvent(priority = EventPriority.HIGHEST, receiveCanceled = true)
        public static void onLivingDeath(LivingDeathEvent event) {
            LivingEntity entity = event.getEntity();
            DamageSource source = event.getSource();
            if (!(entity.level() instanceof ServerLevel level) || !isTaczDamage(source)) {
                return;
            }

            PENDING.put(entity.getUUID(), new PendingDrop(
                entity.getUUID(),
                level,
                entity,
                source,
                level.getGameTime() + 1L
            ));
        }

        @SubscribeEvent(priority = EventPriority.LOWEST, receiveCanceled = true)
        public static void onLivingDrops(LivingDropsEvent event) {
            LivingEntity entity = event.getEntity();
            DamageSource source = event.getSource();
            if (!(entity.level() instanceof ServerLevel level) || !isTaczDamage(source)) {
                return;
            }

            PENDING.remove(entity.getUUID());

            if (!event.isCanceled() && !event.getDrops().isEmpty()) {
                return;
            }

            List<ItemStack> generated = generateLoot(level, entity, source);
            if (!generated.isEmpty()) {
                for (ItemStack stack : generated) {
                    event.getDrops().add(new ItemEntity(
                        level,
                        entity.getX(),
                        entity.getY(),
                        entity.getZ(),
                        stack
                    ));
                }
            }

            if (event.isCanceled()) {
                event.setCanceled(false);
            }

            LOGGER.debug("Restored {} TaCZ-kill drop stack(s) for {}", generated.size(), entity.getName().getString());
        }

        @SubscribeEvent
        public static void onServerTick(TickEvent.ServerTickEvent event) {
            if (event.phase != TickEvent.Phase.END || PENDING.isEmpty()) {
                return;
            }

            Iterator<Map.Entry<UUID, PendingDrop>> iterator = PENDING.entrySet().iterator();
            while (iterator.hasNext()) {
                PendingDrop pending = iterator.next().getValue();
                if (pending.level().getGameTime() < pending.dueGameTime()) {
                    continue;
                }

                iterator.remove();
                List<ItemStack> generated = generateLoot(pending.level(), pending.entity(), pending.source());
                for (ItemStack stack : generated) {
                    ItemEntity item = new ItemEntity(
                        pending.level(),
                        pending.entity().getX(),
                        pending.entity().getY(),
                        pending.entity().getZ(),
                        stack
                    );
                    pending.level().addFreshEntity(item);
                }

                LOGGER.debug("Fallback-spawned {} TaCZ-kill drop stack(s) for {}", generated.size(), pending.entity().getName().getString());
            }
        }

        private static boolean isTaczDamage(DamageSource source) {
            if (source.is(TACZ_BULLETS) || source.getMsgId().startsWith("tacz.")) {
                return true;
            }

            Entity direct = source.getDirectEntity();
            return direct != null && direct.getClass().getName().startsWith("com.tacz.guns.");
        }

        private static List<ItemStack> generateLoot(ServerLevel level, LivingEntity entity, DamageSource source) {
            ResourceLocation lootTableId = entity.getLootTable();
            LootTable lootTable = level.getServer().getLootData().getLootTable(lootTableId);
            if (lootTable == LootTable.EMPTY) {
                return List.of();
            }

            LootParams.Builder builder = new LootParams.Builder(level)
                .withParameter(LootContextParams.THIS_ENTITY, entity)
                .withParameter(LootContextParams.ORIGIN, entity.position())
                .withParameter(LootContextParams.DAMAGE_SOURCE, source)
                .withOptionalParameter(LootContextParams.KILLER_ENTITY, source.getEntity())
                .withOptionalParameter(LootContextParams.DIRECT_KILLER_ENTITY, source.getDirectEntity());

            Player lastPlayer = entity.getLastHurtByPlayer();
            if (lastPlayer != null) {
                builder.withParameter(LootContextParams.LAST_DAMAGE_PLAYER, lastPlayer)
                    .withLuck(lastPlayer.getLuck());
            }

            LootParams params = builder.create(LootContextParamSets.ENTITY);
            for (int attempt = 0; attempt < MAX_ROLL_ATTEMPTS; attempt++) {
                List<ItemStack> result = new ArrayList<>(lootTable.getRandomItems(params));
                result.removeIf(ItemStack::isEmpty);
                if (!result.isEmpty()) {
                    return result;
                }
            }

            return List.of();
        }
    }

    private record PendingDrop(
        UUID entityId,
        ServerLevel level,
        LivingEntity entity,
        DamageSource source,
        long dueGameTime
    ) {
    }
}
