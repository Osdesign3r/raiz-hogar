import DashboardCard from "@/components/DashboardCard"

type Props = {
  nombre: string
  cantidad: number
  href: string
}

export default function DocumentGroup({
  nombre,
  cantidad,
  href,
}: Props) {
  return (
    <DashboardCard
      title={nombre}
      description={`${cantidad} documentos`}
      href={href}
      accent="blue"
    />
  )
}