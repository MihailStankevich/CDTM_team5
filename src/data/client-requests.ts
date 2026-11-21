// Simulated inbound client activity (chatbot, meeting/call requests, plan views). Replace with a real feed later.
export type RequestKind = "chatbot" | "reunion" | "llamada" | "consulta_plan";
export interface ClientRequest { slug: string; kind: RequestKind; when: string; text: string }

export const CLIENT_REQUESTS: ClientRequest[] = [
  { slug: "michael-carter", kind: "chatbot", when: "hace 25 min", text: "¿Debería vender parte de mis acciones tech después de la caída de Nvidia?" },
  { slug: "michael-carter", kind: "llamada", when: "hace 2 h", text: "Pide una llamada: le preocupa un posible despido en su empresa." },
  { slug: "daniel-emily-johnson", kind: "reunion", when: "hoy 09:10", text: "Solicitan reunión para revisar el seguro de vida tras el nacimiento de Nora." },
  { slug: "daniel-emily-johnson", kind: "consulta_plan", when: "hoy 08:40", text: "Han abierto 3 veces la sección de ahorro universitario (529)." },
  { slug: "samantha-lewis", kind: "chatbot", when: "ayer", text: "¿Mi plan de jubilación sigue en riesgo con los aranceles?" },
  { slug: "timothy-melanie-weah", kind: "consulta_plan", when: "hace 1 h", text: "Revisando su patrimonio neto y la deuda de la hipoteca." },
];

// Signals that suggest scheduling a meeting even without a request (simulated scraping / CRM rules).
export interface ClientAlert { slug: string; reason: string }
export const CLIENT_ALERTS: ClientAlert[] = [
  { slug: "samantha-lewis", reason: "Sin reunión desde hace 7 meses" },
  { slug: "timothy-melanie-weah", reason: "Detectado cambio de trabajo de Melanie (LinkedIn)" },
];
