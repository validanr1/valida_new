import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Building2, CreditCard, LayoutGrid, Settings, Users } from "lucide-react";

export default function Help() {
    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-[#0E3A4D]">Central de Ajuda</h1>
                <p className="text-muted-foreground">
                    Guia completo para administração da plataforma Valida NR1.
                </p>
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 h-auto p-1 bg-muted/50">
                    <TabsTrigger value="overview" className="flex flex-col gap-2 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <LayoutGrid className="h-5 w-5" />
                        <span>Visão Geral</span>
                    </TabsTrigger>
                    <TabsTrigger value="partners" className="flex flex-col gap-2 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Users className="h-5 w-5" />
                        <span>Parceiros</span>
                    </TabsTrigger>
                    <TabsTrigger value="companies" className="flex flex-col gap-2 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Building2 className="h-5 w-5" />
                        <span>Empresas</span>
                    </TabsTrigger>
                    <TabsTrigger value="finance" className="flex flex-col gap-2 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <CreditCard className="h-5 w-5" />
                        <span>Financeiro</span>
                    </TabsTrigger>
                    <TabsTrigger value="system" className="flex flex-col gap-2 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Settings className="h-5 w-5" />
                        <span>Sistema</span>
                    </TabsTrigger>
                </TabsList>

                <div className="mt-6">
                    <TabsContent value="overview" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BookOpen className="h-5 w-5 text-[#1DB584]" />
                                    Bem-vindo ao Painel Administrativo
                                </CardTitle>
                                <CardDescription>
                                    Entenda como funciona o ambiente de administração.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p>
                                    O painel administrativo do Valida NR1 é o centro de controle de toda a plataforma.
                                    Aqui você pode gerenciar parceiros, empresas, usuários, planos e acompanhar o desempenho geral do sistema.
                                </p>
                                <div className="grid gap-4 md:grid-cols-3">
                                    <Card className="bg-slate-50 border-none shadow-sm">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-lg">Dashboard</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground">
                                                Visão geral das métricas mais importantes, como novos parceiros, receita e atividades recentes.
                                            </p>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-slate-50 border-none shadow-sm">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-lg">Navegação</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground">
                                                Use o menu lateral para acessar todas as funcionalidades. O menu pode ser recolhido para ganhar mais espaço.
                                            </p>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-slate-50 border-none shadow-sm">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-lg">Permissões</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground">
                                                O acesso às funcionalidades é controlado por permissões. Se você não vê uma opção, verifique seu nível de acesso.
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="partners" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Gestão de Parceiros</CardTitle>
                                <CardDescription>
                                    Como gerenciar os parceiros que utilizam a plataforma.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Accordion type="single" collapsible className="w-full">
                                    <AccordionItem value="item-1">
                                        <AccordionTrigger>Como cadastrar um novo parceiro?</AccordionTrigger>
                                        <AccordionContent>
                                            Vá até a página <strong>Parceiros</strong> e clique no botão <strong>Novo Parceiro</strong>.
                                            Preencha os dados obrigatórios como Nome, CNPJ e Email do administrador. O parceiro receberá um email para definir a senha.
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="item-2">
                                        <AccordionTrigger>Como visualizar os detalhes de um parceiro?</AccordionTrigger>
                                        <AccordionContent>
                                            Na lista de parceiros, clique no nome ou no ícone de visualização. Você verá informações detalhadas,
                                            empresas vinculadas, usuários e histórico de atividades.
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="item-3">
                                        <AccordionTrigger>Como bloquear ou suspender um parceiro?</AccordionTrigger>
                                        <AccordionContent>
                                            Nos detalhes do parceiro, procure pela opção de <strong>Status</strong>.
                                            Você pode alterar para "Suspenso" ou "Inativo". Isso impedirá o acesso do parceiro e de seus usuários à plataforma.
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="companies" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Gestão de Empresas</CardTitle>
                                <CardDescription>
                                    Administração das empresas clientes dos parceiros.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Accordion type="single" collapsible className="w-full">
                                    <AccordionItem value="item-1">
                                        <AccordionTrigger>O que são as Empresas?</AccordionTrigger>
                                        <AccordionContent>
                                            Empresas são os clientes finais que são atendidos pelos Parceiros.
                                            Cada parceiro pode cadastrar múltiplas empresas para realizar avaliações e gerar relatórios.
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="item-2">
                                        <AccordionTrigger>Posso cadastrar uma empresa diretamente?</AccordionTrigger>
                                        <AccordionContent>
                                            Geralmente, as empresas são cadastradas pelos próprios Parceiros.
                                            No entanto, como administrador, você tem permissão para criar empresas e vinculá-las a um parceiro específico.
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="finance" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Financeiro e Planos</CardTitle>
                                <CardDescription>
                                    Gerenciamento de assinaturas, planos e faturamento.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Accordion type="single" collapsible className="w-full">
                                    <AccordionItem value="item-1">
                                        <AccordionTrigger>Como criar novos planos?</AccordionTrigger>
                                        <AccordionContent>
                                            Acesse a seção <strong>Planos</strong>. Lá você pode definir novos planos de assinatura,
                                            configurar limites (número de usuários, empresas, avaliações) e definir preços.
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="item-2">
                                        <AccordionTrigger>Como funciona o faturamento?</AccordionTrigger>
                                        <AccordionContent>
                                            A seção <strong>Faturamento</strong> mostra o histórico de pagamentos e faturas geradas.
                                            O sistema pode ser integrado a gateways de pagamento para processamento automático.
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="system" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Configurações do Sistema</CardTitle>
                                <CardDescription>
                                    Ajustes globais, usuários administrativos e jurídico.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Accordion type="single" collapsible className="w-full">
                                    <AccordionItem value="item-1">
                                        <AccordionTrigger>Gerenciamento de Usuários Admin</AccordionTrigger>
                                        <AccordionContent>
                                            Em <strong>Usuários</strong>, você pode convidar outros administradores para a plataforma
                                            e definir seus níveis de permissão (roles).
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="item-2">
                                        <AccordionTrigger>Configurações da Plataforma</AccordionTrigger>
                                        <AccordionContent>
                                            Em <strong>Configurações</strong>, você pode alterar o nome da plataforma, logo,
                                            cores do tema e outras preferências visuais e funcionais globais.
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="item-3">
                                        <AccordionTrigger>Jurídico e LGPD</AccordionTrigger>
                                        <AccordionContent>
                                            A seção <strong>Jurídico</strong> permite gerenciar os textos dos Termos de Uso,
                                            Política de Privacidade e outros documentos legais que os usuários devem aceitar.
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
