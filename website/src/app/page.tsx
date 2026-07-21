import Link from "next/link";
import { ArrowRight, Braces, CircleDot, Github, Layers3, Radio, Sparkles } from "lucide-react";
import { CodeBlock } from "@/components/code-block";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { brandAssets } from "@/lib/brand";
import { githubUrl, heroCode } from "@/lib/content";
import { getRepositorySnapshot } from "@/lib/github";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

const featureIcons = [CircleDot, Braces, Radio] as const;

const homeCopy = {
  en: {
    badge: "Request-owned work for TypeScript",
    title: ["Keep the work", "inside the request."],
    description:
      "Nelo keeps child tasks, cooperative cancellation, scoped resources, and response delivery within the request that started them, while preserving standard Request and Response APIs.",
    summaryEyebrow: "Tasks, resources, and delivery",
    summaryTitle: "One request. One lifetime.",
    features: [
      {
        title: "Owned tasks",
        text: "Start child work with a parent scope and pass the same cancellation signal through it.",
      },
      {
        title: "Scoped resources",
        text: "Register acquisition and cleanup together, then release each resource once in reverse order.",
      },
      {
        title: "Delivery lifetime",
        text: "Keep streams and their resources alive after the handler returns, until delivery actually ends.",
      },
    ],
  },
  ja: {
    badge: "リクエストに紐づく処理を管理",
    title: ["始まった処理を、", "終わるまで管理する。"],
    description:
      "Neloは、子タスク、中断通知、リソース、レスポンス配信を、処理を始めたリクエストに紐づけます。RequestとResponseは標準のまま、ハンドラーが返った後に残る処理まで管理します。",
    summaryEyebrow: "タスク、リソース、レスポンス配信",
    summaryTitle: "ひとつのリクエストに、ひとつの寿命を。",
    features: [
      {
        title: "タスクを紐づける",
        text: "子タスクに親スコープを持たせ、同じ中断通知を処理の最後まで渡します。",
      },
      {
        title: "リソースを解放する",
        text: "取得と後片付けを一緒に登録し、使い終えたリソースを逆順で一度だけ解放します。",
      },
      {
        title: "配信の終了まで待つ",
        text: "ハンドラーが返った後も、ストリームと必要なリソースを配信終了まで維持します。",
      },
    ],
  },
  ko: {
    badge: "요청에 속한 작업을 관리",
    title: ["시작한 작업을", "끝날 때까지 관리합니다."],
    description:
      "Nelo는 자식 작업, 취소 신호, 리소스, 응답 전송을 이를 시작한 요청에 연결합니다. 표준 Request와 Response를 유지하면서 핸들러 반환 뒤에 남는 작업까지 관리합니다.",
    summaryEyebrow: "작업, 리소스, 응답 전송",
    summaryTitle: "하나의 요청에 하나의 수명 주기.",
    features: [
      {
        title: "작업 연결",
        text: "자식 작업에 부모 범위를 지정하고 같은 취소 신호를 작업이 끝날 때까지 전달합니다.",
      },
      {
        title: "리소스 정리",
        text: "획득과 정리를 함께 등록하고 사용이 끝난 리소스를 역순으로 한 번만 해제합니다.",
      },
      {
        title: "전송 종료 추적",
        text: "핸들러가 반환된 뒤에도 스트림과 필요한 리소스를 전송이 끝날 때까지 유지합니다.",
      },
    ],
  },
  zh: {
    badge: "管理属于请求的工作",
    title: ["从请求开始，", "到工作真正结束。"],
    description:
      "Nelo 将子任务、取消信号、资源和响应传输归到发起它们的请求中。在保留标准 Request 与 Response API 的同时，也管理处理器返回后仍未结束的工作。",
    summaryEyebrow: "任务、资源与响应传输",
    summaryTitle: "一个请求，一段明确的生命周期。",
    features: [
      {
        title: "归属子任务",
        text: "为子任务指定父级作用域，并把同一个取消信号传递到工作结束。",
      },
      {
        title: "释放资源",
        text: "把获取和清理一起登记，使用结束后按相反顺序只释放一次。",
      },
      {
        title: "跟踪传输结束",
        text: "即使处理器已经返回，也会让流和所需资源保留到响应传输结束。",
      },
    ],
  },
} as const;

export default async function HomePage() {
  const [repo, locale] = await Promise.all([getRepositorySnapshot(), getLocale()]);
  const t = getDictionary(locale);
  const copy = homeCopy[locale];

  return (
    <main>
      <SiteHeader />

      <section className="home-hero page-shell">
        <div className="hero-copy">
          <div className="hero-mark">
            <img src={brandAssets.icon} alt="Nelo" width={42} height={42} />
            <span>{copy.badge}</span>
          </div>
          <h1 className="brand-headline">
            {copy.title[0]}
            <br />
            {copy.title[1]}
          </h1>
          <p>{copy.description}</p>
          <div className="hero-actions">
            <Link href="/docs" className="glass-button primary">
              {t.home.readDocs} <ArrowRight size={15} />
            </Link>
            <a href={githubUrl} className="glass-button secondary">
              <Github size={15} /> GitHub
            </a>
          </div>
          <div className="hero-facts" aria-label="Project facts">
            <span>
              <strong>62</strong> {t.home.tests}
            </span>
            <span>
              <strong>04</strong> {t.home.phases}
            </span>
            <span>
              <strong>{repo.stars}</strong> {t.home.stars}
            </span>
            <span>
              <strong>Apache</strong> 2.0
            </span>
          </div>
        </div>

        <div className="liquid-stage" aria-label="Nelo request lifecycle preview">
          <div className="liquid-orb orb-one" />
          <div className="liquid-orb orb-two" />
          <div className="stage-glass">
            <div className="stage-titlebar">
              <div>
                <span />
                <span />
                <span />
              </div>
              <p>app.ts</p>
              <small>Handler Scope</small>
            </div>
            <CodeBlock code={heroCode} filename="app.ts" compact />
            <div className="scope-rail">
              <span>request</span>
              <i />
              <span>handler</span>
              <i />
              <span>delivery</span>
            </div>
          </div>
        </div>
      </section>

      <section className="home-summary page-shell">
        <div className="summary-heading">
          <p className="eyebrow brand-kicker">{copy.summaryEyebrow}</p>
          <h2 className="brand-heading">{copy.summaryTitle}</h2>
          <Link href="/docs/concepts/request-ownership">
            {t.home.understand} <ArrowRight size={14} />
          </Link>
        </div>
        <div className="feature-grid">
          {copy.features.map(({ title, text }, index) => {
            const Icon = featureIcons[index]!;
            return (
              <article className="feature-glass" key={title}>
                <div className="feature-top">
                  <span>0{index + 1}</span>
                  <Icon size={18} />
                </div>
                <h3 className="brand-feature-title">{title}</h3>
                <p>{text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="page-links page-shell" aria-label="Explore Nelo">
        <Link href="/docs" className="page-link-card large">
          <div>
            <span>{t.nav.docs}</span>
            <h2>{t.home.cards.docs}</h2>
          </div>
          <ArrowRight size={22} />
        </Link>
        <Link href="/examples" className="page-link-card">
          <Sparkles size={19} />
          <div>
            <span>{t.nav.examples}</span>
            <h3>{t.home.cards.examples}</h3>
          </div>
          <ArrowRight size={18} />
        </Link>
        <Link href="/roadmap" className="page-link-card">
          <Layers3 size={19} />
          <div>
            <span>{t.nav.roadmap}</span>
            <h3>{t.home.cards.roadmap}</h3>
          </div>
          <ArrowRight size={18} />
        </Link>
      </section>

      <SiteFooter />
    </main>
  );
}
