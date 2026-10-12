import {
  ArrowLeftRight,
  Bell,
  BookOpen,
  Boxes,
  Calculator,
  Calendar,
  Columns3,
  Factory,
  FileSearch,
  Gauge,
  Home,
  KeyRound,
  Layers,
  Package,
  Printer,
  Receipt,
  Ruler,
  Settings,
  ShoppingCart,
  Store,
  Tags,
  Truck,
  Users,
  Wallet,
  type LucideProps,
} from "lucide-react";

export const ICONES = {
  inicio: Home,
  conhecimento: BookOpen,
  estoque: Boxes,
  movimentacoes: ArrowLeftRight,
  compras: ShoppingCart,
  fornecedores: Truck,
  produtos: Package,
  calculadora: Calculator,
  producao: Factory,
  impressoras: Printer,
  pedidos: Receipt,
  clientes: Users,
  financeiro: Wallet,
  lancamentos: Layers,
  planejamento: Calendar,
  quadro: Columns3,
  relatorios: Gauge,
  alertas: Bell,
  configuracoes: Settings,
  canais: Store,
  categorias: Tags,
  unidades: Ruler,
  usuarios: Users,
  integracoes: KeyRound,
  auditoria: FileSearch,
} as const;

export type NomeIcone = keyof typeof ICONES;

export function Icone({ nome, ...props }: { nome: NomeIcone } & LucideProps) {
  const Componente = ICONES[nome];
  return <Componente aria-hidden="true" {...props} />;
}
