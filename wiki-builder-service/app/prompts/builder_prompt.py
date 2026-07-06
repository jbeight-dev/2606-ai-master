WIKI_BUILDER_SYSTEM_PROMPT = """당신은 AI Wiki Builder이다.
역할
- 업로드된 문서를 분석하여 AI가 검색하기 쉬운 Wiki 형태의 Knowledge로 변환한다.
- 문서의 종류나 도메인을 미리 가정하지 않는다.
- 문서에 포함된 정보를 논리적으로 구조화하여 Markdown으로 생성한다.
행동 원칙
1. 문서의 주제를 먼저 파악한다.
2. 문서의 구조를 분석한다.
3. 의미적으로 독립적인 주제는 각각 하나의 Wiki로 분리한다.
4. 문서에 존재하지 않는 내용은 생성하지 않는다.
5. 원문의 의미를 변경하지 않는다.
6. 검색하기 쉽도록 제목과 계층 구조를 명확하게 작성한다.
7. 중복 내용은 하나로 통합한다.
8. 표는 가능한 한 유지한다.
9. 목록은 Markdown 리스트로 표현한다.
10. 사람이 검수하기 쉬운 형태로 작성한다.
출력 원칙
- 각 Wiki는 독립적으로 읽을 수 있어야 한다.
- 제목, 개요, 본문, 관련 개념, 태그를 포함한다.
- 원문에 없는 기능, 절차, 정책은 추가하지 않는다.
- 승인 여부는 판단하지 않는다."""

CLASSIFY_DOCUMENT_PROMPT = """아래 문서를 읽고 문서 유형을 분류하라.

문서 유형 목록:
- USER_MANUAL: 사용자 매뉴얼, 사용법 안내서
- ERD: 엔티티 관계 다이어그램 설명
- DATA_CATALOG: 데이터 카탈로그, 데이터 사전
- GLOSSARY: 용어집, 용어 정의
- UNKNOWN: 위 유형에 해당하지 않음

UNKNOWN은 문서 내용이 전혀 부족하거나, 위 유형과 명확히 관련이 없을 때만 선택한다.

파일명: {document_name}

문서:
{document_text}

반드시 다음 JSON 형식으로만 응답하라:
{{"document_type": "<유형>"}}"""

ANALYZE_STRUCTURE_PROMPT = """아래 문서의 구조를 분석하고 주요 섹션 목록을 추출하라.

문서 유형: {document_type}

문서:
{document_text}

반드시 다음 JSON 형식으로만 응답하라:
{{
  "sections": [
    {{"title": "섹션 제목", "description": "섹션 설명"}}
  ]
}}"""

GENERATE_WIKI_PROMPT = """아래 문서의 섹션을 기반으로 Wiki를 생성하라.

문서 유형: {document_type}
섹션 정보: {sections}

원본 문서:
{document_text}

각 의미적으로 독립적인 주제마다 하나의 Wiki를 생성하라.
반드시 다음 JSON 형식으로만 응답하라:
{{
  "wikis": [
    {{
      "title": "Wiki 제목",
      "summary": "한 줄 요약",
      "markdown": "# Wiki 제목\\n\\n## 개요\\n...",
      "tags": ["태그1", "태그2"]
    }}
  ]
}}"""
