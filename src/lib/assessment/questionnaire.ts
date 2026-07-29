export interface QuestionOption {
  value: number;
  label: string;
}

export interface Question {
  id: string;
  prompt: string;
  helper?: string;
  options: QuestionOption[];
}

export interface Section {
  id: string;
  title: string;
  intent: string;
  weight: number;
  questions: Question[];
}

const SCALE: QuestionOption[] = [
  { value: 1, label: "Absent" },
  { value: 2, label: "Emerging" },
  { value: 3, label: "Established" },
  { value: 4, label: "Managed" },
  { value: 5, label: "Optimising" },
];

export const QUESTIONNAIRE: Section[] = [
  {
    id: "flow",
    title: "Delivery Flow",
    intent: "How predictably work moves from intent to production.",
    weight: 1.2,
    questions: [
      {
        id: "flow.wip",
        prompt: "Work in progress is explicitly limited and visible.",
        helper: "Boards, queues and hand-offs reflect real constraints.",
        options: SCALE,
      },
      {
        id: "flow.cycle_time",
        prompt: "Cycle time is measured and actively managed.",
        options: SCALE,
      },
      {
        id: "flow.dependencies",
        prompt: "Cross-team dependencies are mapped and sequenced ahead of time.",
        options: SCALE,
      },
      {
        id: "flow.unplanned",
        prompt: "Unplanned work is tracked and kept within an agreed threshold.",
        options: SCALE,
      },
    ],
  },
  {
    id: "engineering",
    title: "Engineering Practice",
    intent: "The technical foundations that make change safe and cheap.",
    weight: 1.3,
    questions: [
      {
        id: "eng.ci",
        prompt: "Trunk-based development with automated CI is the norm.",
        options: SCALE,
      },
      {
        id: "eng.tests",
        prompt: "Automated test coverage gives the team confidence to release.",
        options: SCALE,
      },
      {
        id: "eng.deploy",
        prompt: "Deployments are automated, repeatable and reversible.",
        options: SCALE,
      },
      {
        id: "eng.debt",
        prompt: "Technical debt is captured, prioritised and paid down deliberately.",
        options: SCALE,
      },
    ],
  },
  {
    id: "governance",
    title: "Governance & Assurance",
    intent: "How decisions, risk and compliance are handled without stalling flow.",
    weight: 1.0,
    questions: [
      {
        id: "gov.decisions",
        prompt: "Decision rights are clear and decisions are recorded.",
        options: SCALE,
      },
      {
        id: "gov.risk",
        prompt: "Delivery risk is reviewed on a regular, lightweight cadence.",
        options: SCALE,
      },
      {
        id: "gov.reporting",
        prompt: "Reporting is drawn from delivery systems rather than assembled by hand.",
        options: SCALE,
      },
      {
        id: "gov.compliance",
        prompt: "Compliance controls are embedded into the delivery pipeline.",
        options: SCALE,
      },
    ],
  },
  {
    id: "value",
    title: "Value & Outcomes",
    intent: "Whether delivery is connected to measurable business outcomes.",
    weight: 1.4,
    questions: [
      {
        id: "value.outcomes",
        prompt: "Every initiative has a named outcome and a measure of success.",
        options: SCALE,
      },
      {
        id: "value.feedback",
        prompt: "Product feedback reaches delivery teams within days, not quarters.",
        options: SCALE,
      },
      {
        id: "value.prioritisation",
        prompt: "Prioritisation is evidence-led and revisited on a fixed cadence.",
        options: SCALE,
      },
      {
        id: "value.benefits",
        prompt: "Benefits realised after release are tracked against the original case.",
        options: SCALE,
      },
    ],
  },
];

export const ALL_QUESTIONS: Question[] = QUESTIONNAIRE.flatMap((section) => section.questions);

export const TOTAL_QUESTIONS = ALL_QUESTIONS.length;

export function sectionOf(questionId: string): Section | undefined {
  return QUESTIONNAIRE.find((section) => section.questions.some((q) => q.id === questionId));
}
