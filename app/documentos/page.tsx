export default function DocumentosPage() {
  const categorias = [
    {
      nombre: "Familia",
      cantidad: 5,
      icono: "👨‍👩‍👧",
    },
    {
      nombre: "Oriana",
      cantidad: 3,
      icono: "👧",
    },
    {
      nombre: "Hogar",
      cantidad: 8,
      icono: "🏠",
    },
    {
      nombre: "Finanzas",
      cantidad: 4,
      icono: "💰",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 pb-24">

      <div className="max-w-md mx-auto">

        <h1 className="text-3xl font-bold mb-2">
          Documentos
        </h1>

        <p className="text-slate-400 mb-6">
          Centro documental del hogar
        </p>

        <div className="bg-slate-900 p-4 rounded-xl mb-6">
          <p className="text-sm text-slate-400">
            Total documentos
          </p>

          <p className="text-2xl font-bold">
            20
          </p>
        </div>

        <div className="space-y-4">
          {categorias.map((categoria) => (
            <div
              key={categoria.nombre}
              className="bg-slate-900 p-4 rounded-xl"
            >
              <div className="flex justify-between items-center">

                <div>
                  <h2 className="font-semibold">
                    {categoria.icono} {categoria.nombre}
                  </h2>

                  <p className="text-sm text-slate-400">
                    {categoria.cantidad} documentos
                  </p>
                </div>

              </div>
            </div>
          ))}
        </div>

      </div>

    </main>
  );
}