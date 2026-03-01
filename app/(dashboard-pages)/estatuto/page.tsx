import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default function Estatuto() {
  return (
    <div className="min-h-screen bg-gray-800 p-2">
      <div className="bg-zinc-900 min-h-screen rounded-3xl p-6">
        
        {/* Header */}
        <div className="flex mb-6 items-center">
          <SidebarTrigger />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <h1 className="text-2xl font-bold mx-2">Estatuto</h1>
        </div>

        {/* ================= COZINHA ================= */}
        <h1 className="text-4xl font-bold py-4 text-center">Cozinha</h1>
        <hr className="my-4 border-zinc-700" />

        <p className="text-2xl font-medium mt-6">
          Art. 1{" "}
          <span className="text-xl font-light block mt-2">
            Lavar a louça sempre após o uso. É tolerado deixá-la por até 12 horas,
            desde que toda a louça caiba dentro da cuba da pia. Todo excedente
            deve ser lavado imediatamente.
          </span>
        </p>

        <p className="text-2xl font-medium mt-6">
          Art. 2{" "}
          <span className="text-xl font-light block mt-2">
            Todos os panos utilizados devem estar limpos. Caso estejam sujos,
            devem ser encaminhados para lavagem.
          </span>
        </p>

        <p className="text-2xl font-medium mt-6">
          Art. 3{" "}
          <span className="text-xl font-light block mt-2">
            Guardar todos os utensílios nos devidos lugares para manter a
            organização da casa.
          </span>
        </p>

        {/* ================= BANHEIRO ================= */}
        <h1 className="block mt-16 text-4xl font-bold py-4 text-center">
          Banheiro
        </h1>
        <hr className="my-4 border-zinc-700" />

        <p className="text-2xl font-medium mt-6">
          Art. 1{" "}
          <span className="text-xl font-light block mt-2">
            Manter o banheiro sempre organizado para o próximo morador.
          </span>
        </p>

        <p className="text-2xl font-medium mt-6">
          Art. 2{" "}
          <span className="text-xl font-light block mt-2">
            Não deixar roupas, toalhas ou objetos pessoais espalhados.
          </span>
        </p>

        {/* ================= ÁREAS COMUNS ================= */}
        <h1 className="block mt-16 text-4xl font-bold py-4 text-center">
          Áreas Comuns
        </h1>
        <hr className="my-4 border-zinc-700" />

        <p className="text-2xl font-medium mt-6">
          Art. 1{" "}
          <span className="text-xl font-light block mt-2">
            Manter sala e demais áreas organizadas após o uso.
          </span>
        </p>

        {/* ================= SILÊNCIO ================= */}
        <h1 className="block mt-16 text-4xl font-bold py-4 text-center">
          Silêncio
        </h1>
        <hr className="my-4 border-zinc-700" />

        <p className="text-2xl font-medium mt-6">
          Art. 1{" "}
          <span className="text-xl font-light block mt-2">
            Respeitar o horário de silêncio das 00h às 8h.
          </span>
        </p>

        <p className="text-2xl font-medium mt-6 mb-16">
          Art. 2{" "}
          <span className="text-xl font-light block mt-2">
            Avisar previamente os moradores em caso de visitas e reuniões, sendo possível uma conversa sobre isso.
          </span>
        </p>
      </div>
    </div>
  );
}