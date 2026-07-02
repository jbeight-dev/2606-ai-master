import type {
  Document,
  WikiNode,
  ChatMessage,
  ReviewItem,
  AnalysisStep,
} from "@/types/llm-wiki";

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

// ─── Documents ────────────────────────────────────────────────────────────────

export const MOCK_DOCUMENTS: Document[] = [
  {
    id: "doc-1",
    name: "주문관리시스템_요구사항.pdf",
    type: "PDF",
    size: 2048000,
    uploadedAt: "2026-06-30T09:00:00Z",
    status: "approved",
  },
  {
    id: "doc-2",
    name: "결제모듈_API명세서.docx",
    type: "Word",
    size: 512000,
    uploadedAt: "2026-07-01T11:30:00Z",
    status: "pending_review",
  },
  {
    id: "doc-3",
    name: "DB설계서_v2.3.xlsx",
    type: "Excel",
    size: 768000,
    uploadedAt: "2026-07-01T14:00:00Z",
    status: "analyzing",
    analysisPct: 65,
  },
  {
    id: "doc-4",
    name: "용어집_2026.md",
    type: "Markdown",
    size: 128000,
    uploadedAt: "2026-07-02T08:00:00Z",
    status: "pending_review",
  },
  {
    id: "doc-5",
    name: "Release_Notes_v3.1.html",
    type: "HTML",
    size: 256000,
    uploadedAt: "2026-07-02T10:00:00Z",
    status: "approved",
  },
];

export const ANALYSIS_STEPS: AnalysisStep[] = [
  { id: "step-1", label: "문서 파싱", status: "completed" },
  { id: "step-2", label: "구조 분석", status: "completed" },
  { id: "step-3", label: "엔티티 추출", status: "in_progress" },
  { id: "step-4", label: "Wiki 노드 생성", status: "pending" },
  { id: "step-5", label: "관계 매핑", status: "pending" },
  { id: "step-6", label: "검수 대기", status: "pending" },
];

// ─── Wiki Tree ────────────────────────────────────────────────────────────────

export const MOCK_WIKI_TREE: WikiNode[] = [
  {
    id: "sys-1",
    category: "Systems",
    title: "주문관리시스템 (OMS)",
    children: [
      { id: "sys-1-1", category: "Systems", title: "주문 처리 모듈", parentId: "sys-1" },
      { id: "sys-1-2", category: "Systems", title: "재고 연동 모듈", parentId: "sys-1" },
    ],
  },
  {
    id: "sys-2",
    category: "Systems",
    title: "결제 시스템 (PG)",
    children: [
      { id: "sys-2-1", category: "Systems", title: "카드 결제", parentId: "sys-2" },
      { id: "sys-2-2", category: "Systems", title: "간편 결제", parentId: "sys-2" },
    ],
  },
  {
    id: "scr-1",
    category: "Screens",
    title: "주문 목록 화면",
    children: [
      { id: "scr-1-1", category: "Screens", title: "주문 상세 팝업", parentId: "scr-1" },
      { id: "scr-1-2", category: "Screens", title: "주문 필터 패널", parentId: "scr-1" },
    ],
  },
  {
    id: "scr-2",
    category: "Screens",
    title: "결제 화면",
  },
  {
    id: "api-1",
    category: "API",
    title: "POST /orders",
    children: [
      { id: "api-1-1", category: "API", title: "GET /orders/{id}", parentId: "api-1" },
      { id: "api-1-2", category: "API", title: "PATCH /orders/{id}/status", parentId: "api-1" },
    ],
  },
  {
    id: "tbl-1",
    category: "Tables",
    title: "orders",
    children: [
      { id: "tbl-1-1", category: "Tables", title: "order_items", parentId: "tbl-1" },
      { id: "tbl-1-2", category: "Tables", title: "order_payments", parentId: "tbl-1" },
    ],
  },
  {
    id: "gls-1",
    category: "Glossary",
    title: "주문(Order)",
  },
  {
    id: "gls-2",
    category: "Glossary",
    title: "결제(Payment)",
  },
  {
    id: "rel-1",
    category: "Release",
    title: "v3.1.0 릴리즈 노트",
  },
];

// ─── Wiki Node Details ─────────────────────────────────────────────────────────

export const MOCK_WIKI_NODES: Record<string, WikiNode> = {
  "api-1": {
    id: "api-1",
    category: "API",
    title: "POST /orders",
    meta: {
      version: "v2.3",
      lastUpdated: "2026-07-01",
      status: "approved",
      relatedDocuments: ["결제모듈_API명세서.docx"],
    },
    content: {
      summary: "신규 주문을 생성하는 API 엔드포인트입니다. 주문 항목, 배송지, 결제 정보를 포함합니다.",
      features: [
        { id: "f1", title: "주문 생성", description: "장바구니 기반의 주문 데이터를 검증하고 저장합니다." },
        { id: "f2", title: "재고 차감", description: "주문 확정 시 실시간으로 재고를 차감합니다." },
        { id: "f3", title: "알림 발송", description: "주문 완료 시 이메일/SMS 알림을 발송합니다." },
      ],
      apiSpec: {
        method: "POST",
        path: "/api/v1/orders",
        description: "신규 주문을 생성합니다.",
        parameters: [
          { name: "items", type: "Array<OrderItem>", required: true, description: "주문 항목 목록" },
          { name: "shippingAddress", type: "Address", required: true, description: "배송지 정보" },
          { name: "paymentMethod", type: "string", required: true, description: "결제 수단 (card, kakao, naver)" },
          { name: "couponCode", type: "string", required: false, description: "쿠폰 코드" },
        ],
        responseExample: `{\n  "orderId": "ORD-20260702-001",\n  "status": "pending",\n  "totalAmount": 89000,\n  "createdAt": "2026-07-02T10:00:00Z"\n}`,
      },
      faqs: [
        { question: "주문 생성 후 재고가 부족하면 어떻게 되나요?", answer: "재고 부족 시 409 Conflict 응답을 반환하며 주문이 생성되지 않습니다." },
        { question: "쿠폰 중복 사용이 가능한가요?", answer: "현재 버전에서는 쿠폰 1개만 적용 가능합니다." },
      ],
      relatedNodes: [
        { id: "tbl-1", title: "orders", category: "Tables" },
        { id: "scr-2", title: "결제 화면", category: "Screens" },
        { id: "gls-1", title: "주문(Order)", category: "Glossary" },
      ],
    },
  },
  "tbl-1": {
    id: "tbl-1",
    category: "Tables",
    title: "orders",
    meta: {
      version: "v2.1",
      lastUpdated: "2026-06-28",
      status: "approved",
      relatedDocuments: ["DB설계서_v2.3.xlsx"],
    },
    content: {
      summary: "주문 정보를 저장하는 메인 테이블입니다.",
      tableSpec: {
        tableName: "orders",
        description: "고객 주문의 마스터 데이터를 관리합니다.",
        columns: [
          { name: "id", type: "BIGINT", nullable: false, description: "주문 고유 ID (PK)" },
          { name: "order_number", type: "VARCHAR(50)", nullable: false, description: "주문 번호 (ORD-YYYYMMDD-NNN)" },
          { name: "user_id", type: "BIGINT", nullable: false, description: "주문 고객 ID (FK → users.id)" },
          { name: "status", type: "VARCHAR(20)", nullable: false, description: "주문 상태 (pending/confirmed/shipped/delivered/cancelled)" },
          { name: "total_amount", type: "DECIMAL(12,2)", nullable: false, description: "총 결제 금액" },
          { name: "shipping_address", type: "JSONB", nullable: false, description: "배송지 정보" },
          { name: "created_at", type: "TIMESTAMPTZ", nullable: false, description: "생성 일시" },
          { name: "updated_at", type: "TIMESTAMPTZ", nullable: false, description: "수정 일시" },
        ],
      },
      faqs: [
        { question: "주문 상태는 몇 가지인가요?", answer: "pending, confirmed, shipped, delivered, cancelled 5가지입니다." },
      ],
      relatedNodes: [
        { id: "tbl-1-1", title: "order_items", category: "Tables" },
        { id: "api-1", title: "POST /orders", category: "API" },
      ],
    },
  },
};

// ─── Review Items ──────────────────────────────────────────────────────────────

export const MOCK_REVIEW_ITEMS: ReviewItem[] = [
  {
    id: "rev-1",
    documentId: "doc-2",
    documentName: "결제모듈_API명세서.docx",
    nodeId: "api-1-1",
    nodeTitle: "GET /orders/{id}",
    category: "API",
    originalContent: "주문 ID로 주문 상세 정보를 조회하는 엔드포인트. 응답에 주문 항목, 배송 정보, 결제 내역 포함.",
    aiContent: "특정 주문의 상세 정보를 조회합니다. 주문 항목(OrderItem), 배송지(ShippingAddress), 결제 내역(PaymentHistory)을 포함한 통합 뷰를 반환합니다. 권한: 본인 주문 또는 관리자 권한 필요.",
    status: "pending",
  },
  {
    id: "rev-2",
    documentId: "doc-2",
    documentName: "결제모듈_API명세서.docx",
    nodeId: "api-1-2",
    nodeTitle: "PATCH /orders/{id}/status",
    category: "API",
    originalContent: "주문 상태 변경 API. 관리자만 사용 가능.",
    aiContent: "주문 상태를 업데이트합니다. 허용 상태 전환: pending→confirmed→shipped→delivered, 취소: pending/confirmed→cancelled. 상태 변경 시 이벤트를 발행하여 알림 서비스와 연동됩니다.",
    status: "pending",
  },
  {
    id: "rev-3",
    documentId: "doc-4",
    documentName: "용어집_2026.md",
    nodeId: "gls-1",
    nodeTitle: "주문(Order)",
    category: "Glossary",
    originalContent: "고객이 상품을 구매하기 위해 생성하는 거래 단위.",
    aiContent: "고객이 상품을 구매하기 위해 생성하는 거래 단위입니다. 하나 이상의 주문 항목(OrderItem)으로 구성되며, 단일 배송지와 결제 수단을 가집니다. 주문은 생성 후 결제 완료 시 '확정' 상태로 전환됩니다.",
    status: "pending",
  },
];

// ─── Chat ──────────────────────────────────────────────────────────────────────

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: "msg-0",
    role: "assistant",
    content: "안녕하세요! LLM Wiki Assistant입니다. 시스템, API, 테이블, 화면에 대해 자유롭게 질문해 주세요.",
    timestamp: new Date().toISOString(),
  },
];

// ─── API Functions ─────────────────────────────────────────────────────────────

export async function fetchDocuments(): Promise<Document[]> {
  await delay(400);
  return MOCK_DOCUMENTS;
}

export async function uploadDocument(file: File): Promise<Document> {
  await delay(800);
  const newDoc: Document = {
    id: `doc-${Date.now()}`,
    name: file.name,
    type: file.name.endsWith(".pdf")
      ? "PDF"
      : file.name.endsWith(".docx")
      ? "Word"
      : file.name.endsWith(".xlsx")
      ? "Excel"
      : file.name.endsWith(".md")
      ? "Markdown"
      : "HTML",
    size: file.size,
    uploadedAt: new Date().toISOString(),
    status: "analyzing",
    analysisPct: 0,
  };
  return newDoc;
}

export async function fetchWikiTree(): Promise<WikiNode[]> {
  await delay(300);
  return MOCK_WIKI_TREE;
}

export async function fetchWikiNode(nodeId: string): Promise<WikiNode | null> {
  await delay(300);
  return MOCK_WIKI_NODES[nodeId] ?? null;
}

export async function fetchReviewItems(): Promise<ReviewItem[]> {
  await delay(400);
  return MOCK_REVIEW_ITEMS;
}

export async function approveReviewItem(id: string): Promise<void> {
  await delay(300);
}

export async function rejectReviewItem(id: string): Promise<void> {
  await delay(300);
}

const ASSISTANT_API_URL = "http://0.0.0.0:8000/api/v1/chat";

export async function sendChatMessage(message: string): Promise<ChatMessage> {
  const res = await fetch(ASSISTANT_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: "anonymous", question: message }),
  });

  if (!res.ok) {
    throw new Error(`서버 오류: ${res.status}`);
  }

  const data = await res.json();

  return {
    id: `msg-${Date.now()}`,
    role: "assistant",
    content: data.answer ?? "답변을 가져오지 못했습니다.",
    timestamp: new Date().toISOString(),
  };
}
