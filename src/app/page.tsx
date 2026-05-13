export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#FAF7F2]">
      <div className="text-center space-y-6 px-8 max-w-xl">
        <div className="w-10 h-1 bg-[#B87333] rounded-full mx-auto" />

        <h1 className="font-serif text-5xl text-[#2D4A3E] leading-tight tracking-tight">
          Moova
        </h1>

        <p className="text-[#5A5A5A] text-lg leading-relaxed">
          A nova infraestrutura do corretor brasileiro.
        </p>

        <div className="inline-block bg-[#2D4A3E]/10 text-[#2D4A3E] text-sm font-mono px-4 py-2 rounded-full">
          Configure o .env.local para começar
        </div>

        <p className="text-[#8A8A8A] text-sm">
          Veja <code className="bg-[#EAE3D9] px-1.5 py-0.5 rounded text-[#2D4A3E]">SETUP.md</code> para o guia completo de configuração
        </p>
      </div>
    </main>
  )
}
