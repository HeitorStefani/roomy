import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default function Gastos(){
    return (
    <div className="min-h-screen bg-gray-800 p-2">
        <div className="bg-zinc-900 min-h-screen rounded-3xl p-6">
                {/* Header */}
                <div className="flex mb-6 items-center">

                <SidebarTrigger/>
                <Separator orientation="vertical"
                className="mx-2 data-[orientation=vertical]:h-4"/>
                <h1 className="text-white text-2xl font-bold mx-2">Contas</h1>
                <hr />
        </div>
        </div>
    </div>
    )
}