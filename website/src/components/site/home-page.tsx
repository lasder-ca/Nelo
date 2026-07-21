import Link from "next/link";
import { ArrowRight, Check, Github } from "lucide-react";
import { CodeBlock } from "@/components/code-block";
import { RequestLab } from "@/components/request-lab";
import { RuntimeMatrix } from "@/components/runtime-matrix";
import { Roadmap } from "@/components/roadmap";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { brandAssets } from "@/lib/brand";
import { githubUrl, heroCode } from "@/lib/content";

export type Locale = "ja" | "en" | "ko" | "zh";

type Copy = {
  mark: string;
  title: string;
  lead: string;
  docs: string;
  modelEyebrow: string;
  modelTitle: string;
  modelLead: string;
  handler: string;
  handlerDetail: string;
  handlerState: string;
  delivery: string;
  deliveryDetail: string;
  deliveryState: string;
  apiEyebrow: string;
  apiTitle: string;
  apiLead: string;
  finalEyebrow: string;
  finalTitle: string;
  examples: string;
};

const copy: Record<Locale, Copy> = {
  ja: {
    mark: "TypeScript向け Request Ownership Runtime",
    title: "リクエストから生まれた仕事を、外へ逃がさない。",
    lead: "Neloは、子タスク・中断理由・リソース解放・レスポンス配信を、同じリクエストの寿命として扱うWeb Standardsフレームワークです。",
    docs: "ドキュメントを読む",
    modelEyebrow: "所有モデル",
    modelTitle: "非同期処理には、終わる境界が必要。",
    modelLead: "ハンドラがreturnしても、レスポンス本文の配信は続くことがあります。Neloは二つの寿命を分けたまま、キャンセルと後片付けを失いません。",
    handler: "Handler Scope",
    handlerDetail: "middleware · route handler · context.fork() · context.use()",
    handlerState: "先に完了",
    delivery: "Delivery Scope",
    deliveryDetail: "Response.body · delivery.fork() · delivery.use()",
    deliveryState: "最後に終了",
    apiEyebrow: "サーバーAPIデモ",
    apiTitle: "境界を実際に動かす。",
    apiLead: "正常完了、切断、producer failureを選び、サーバーが返すHandler／Deliveryの時系列を確認できます。",
    finalEyebrow: "Experimental software",
    finalTitle: "リクエスト寿命を、プログラムの一部にする。",
    examples: "実装例を見る",
  },
  en: {
    mark: "Request ownership runtime for TypeScript",
    title: "Keep request work inside the request.",
    lead: "Nelo is a Web Standards framework that treats child tasks, cancellation reasons, resource cleanup, and response delivery as one explicit request lifecycle.",
    docs: "Read the docs",
    modelEyebrow: "Ownership model",
    modelTitle: "Async work needs a boundary.",
    modelLead: "A handler can return while the response body is still delivering. Nelo keeps those lifetimes separate without losing cancellation or cleanup.",
    handler: "Handler Scope",
    handlerDetail: "middleware · route handler · context.fork() · context.use()",
    handlerState: "settles first",
    delivery: "Delivery Scope",
    deliveryDetail: "Response.body · delivery.fork() · delivery.use()",
    deliveryState: "closes last",
    apiEyebrow: "Server-backed API demo",
    apiTitle: "Run the boundary.",
    apiLead: "Choose completion, disconnect, or producer failure and inspect the Handler and Delivery timeline returned by the server.",
    finalEyebrow: "Experimental software",
    finalTitle: "Make request lifetime part of the program.",
    examples: "Browse examples",
  },
  ko: {
    mark: "TypeScript 요청 소유권 런타임",
    title: "요청에서 시작된 작업을 요청 밖에 두지 않습니다.",
    lead: "Nel기 하나의 하위 작업, 취소 이유, 리소스 정리, 응답 전달을 하나의 명시적인 요청 수명으로 다루는 Web Standards 프레임워크입니다.",
    docs: "문서 읽기",
    modelEyebrow: "소유권 모델",
    modelTitle: "비동기 작업에는 끝나는 경계가 필요합니다.",
    modelLead: "핸들러가 반환된 뒤에도 응답 본문 전달은 계속될 수 있습니다. Nelo는 두 수명을 분리하면서 취소와 정리를 유지합니다.",
    handler: "Handler Scope",
    handlerDetail: "middleware · route handler · context.fork() · context.use()",
    handlerState: "먼저 완료",
    delivery: "Delivery Scope",
    deliveryDetail: "Response.body · delivery.fork() · delivery.use()",
    deliveryState: "마지막 종료",
    apiEyebrow: "서버 API 데모",
    apiTitle: "경계를 직접 실행합니다.",
    apiLead: "완료, 연결 해제, producer failure를 선택하고 서버가 반환하는 Handler와 Delivery 타임라인을 확인할 수 있습니다.",
    finalEyebrow: "Experimental software",
    finalTitle: "요청 수명을 프로그램의 일부로 만듭니다.",
    examples: "예제 보기",
  },
  zh: {
    mark: "面向 TypeScript 的请求所有权运行时",
    title: "让请求产生的工作留在请求之内。",
    lead: "Nelo 是一个 Web Standards 框架，把子任务、取消原因、资源清理和响应传输作为同一个明确的请求生命周期处理。",
    docs: "阅读文档",
    modelEyebrow: "所有权模型",
    modelTitle: "异步工作需要明确的结束边界。",
    modelLead: "处理器返回后，响应正文仍可能继续传输。Nelo 将两个生命周期分开，同旞保留取消和清理行为。",
    handler: "Handler Scope",
    handlerDetail: "middleware · route handler · context.fork() · context.use()",
    handlerState: "先完成",
    delivery: "Delivery Scope",
    deliveryDetail: "Response.body · delivery.fork() · delivery.use()",
    deliveryState: "最后结束",
    apiEyebrow: "服务端 API 演示",
    apiTitle: "实际运行生命周期边界。",
    apiLead: "选择正常完成、断开连接或 producer failure，查看服务端返回的 Handler 与 Delivery 时间线。",
    finalEyebrow: "Experimental software",
    finalTitle: "让请求生命周期成为程序的一部分。",
    examples: "查看示例",
  },
};

export function HomePage({ locale = "ja" }: { locale?: Locale }) {
  const t = copy[locale];

  return (
    <main>
      <SiteHeader />

      <section className="hero section-shell">
        <div className="hero-copy-block">
          <div className="project-mark">
            <img src={brandAssets.icon} alt="Nelo" width={40} height={40} />
            <span>{t.mark}</span>
          </div>
          <h1>{t.title}</h1>
          <p>{t.lead}</p>
          <div className="hero-actions">
            <Link href="/docs" className="primary-button">
              {t.docs} <ArrowRight size={15} />
            </Link>
            <a href={githubUrl} className="secondary-button">
              <Github size={15} /> GitHub
            </a>
          </div>
        </div>

        <div className="hero-code">
          <div className="hero-code-label">
            <span>app.ts</span>
            <span>Handler Scope</span>
          </div>
          <CodeBlock code={heroCode} filename="app.ts" compact />
        </div>
      </section>

      <section className="section-shell section-block" id="concept">
        <div className="section-index">01 / Model</div>
        <div className="section-content">
          <div className="section-intro">
            <p className="eyebrow">{t.modelEyebrow}</p>
            <h2>{t.modelTitle}</h2>
            <p>{t.modelLead}</p>
          </div>

          <div className="lifetime-board">
            <div className="lifetime-row">
              <div className="lifetime-number">A</div>
              <div>
                <strong>{t.handler}</strong>
                <p>{t.handlerDetail}</p>
              </div>
              <span>{t.handlerState}</span>
            </div>
            <div className="lifetime-divider" />
            <div className="lifetime-row">
              <div className="lifetime-number">B</div>
              <div>
                <strong>{t.delivery}</strong>
                <p>{t.deliveryDetail}</p>
              </div>
              <span>{t.deliveryState}</span>
            </div>
          </div>

          <div className="standards-row">
            {["Request", "Response", "ReadableStream", "AbortSignal"].map((item) => (
              <span key={item}>
                <Check size={12} /> {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell section-block" id="api">
        <div className="section-index">02 / Live API</div>
        <div className="section-content">
          <div className="section-intro compact-intro">
            <p className="eyebrow">{t.apiEyebrow}</p>
            <h2>{t.apiTitle}</h2>
            <p>{t.apiLead}</p>
          </div>
          <RequestLab />
        </div>
      </section>

      <section className="section-shell section-block" id="runtimes">
        <div className="section-index">03 / Runtimes</div>
        <div className="section-content">
          <RuntimeMatrix />
        </div>
      </section>

      <Roadmap />

      <section className="section-shell final-callout">
        <div>
          <p className="eyebrow">{t.finalEyebrow}</p>
          <h2>{t.finalTitle}</h2>
        </div>
        <div className="final-actions">
          <Link href="/docs" className="primary-button">
            {t.docs} <ArrowRight size={15} />
          </Link>
          <Link href="/examples" className="secondary-button">
            {t.examples}
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
