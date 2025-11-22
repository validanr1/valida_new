import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Step {
    target: string;
    title: string;
    content: string;
    position?: "top" | "bottom" | "left" | "right" | "center";
}

const steps: Step[] = [
    {
        target: "body", // Special target for center modal
        title: "Bem-vindo ao Valida NR1!",
        content: "Este é o seu novo painel administrativo. Vamos fazer um tour rápido para você conhecer as principais funcionalidades.",
        position: "center",
    },
    {
        target: "#admin-sidebar",
        title: "Menu de Navegação",
        content: "Aqui você encontra todas as ferramentas do sistema. O menu é dividido em seções para facilitar o acesso a Parceiros, Empresas, Financeiro e Configurações.",
        position: "right",
    },
    {
        target: "#admin-dashboard-stats",
        title: "Indicadores Principais",
        content: "Acompanhe em tempo real o crescimento da plataforma. Veja o número de parceiros, empresas ativas e a receita mensal.",
        position: "bottom",
    },
    {
        target: "#admin-help-btn",
        title: "Central de Ajuda",
        content: "Dúvidas? Clique aqui para acessar nossa documentação completa, com guias passo a passo sobre todas as funcionalidades.",
        position: "bottom",
    },
    {
        target: "#admin-tasks-btn",
        title: "Tarefas Concluídas",
        content: "Acompanhe as tarefas que foram finalizadas recentemente pela equipe. Mantenha-se atualizado sobre o progresso do desenvolvimento.",
        position: "bottom",
    },
    {
        target: "#admin-profile-menu",
        title: "Seu Perfil",
        content: "Gerencie sua conta, acesse suas configurações pessoais ou faça logout do sistema por aqui.",
        position: "right",
    },
];

interface AdminOnboardingProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AdminOnboarding({ isOpen, onClose }: AdminOnboardingProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [coords, setCoords] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
    const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
    const [filteredSteps, setFilteredSteps] = useState<Step[]>([]);
    const [showOnStartup, setShowOnStartup] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setShowOnStartup(true);
            // Filter steps that exist in the current DOM
            const validSteps = steps.filter(step => {
                if (step.target === "body") return true;
                return !!document.querySelector(step.target);
            });

            if (validSteps.length > 0) {
                setFilteredSteps(validSteps);
                setCurrentStep(0); // Reset to first step when opening
            } else {
                onClose(); // Close if no valid steps found
            }
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || filteredSteps.length === 0) return;

        const updatePosition = () => {
            const step = filteredSteps[currentStep];
            if (!step) return;

            if (step.target === "body") {
                setCoords(null);
                setPopoverStyle({
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    position: "fixed",
                    zIndex: 9999,
                });
                return;
            }

            const element = document.querySelector(step.target);
            if (element) {
                const rect = element.getBoundingClientRect();
                setCoords({
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height,
                });

                // Calculate popover position
                let style: React.CSSProperties = { position: "fixed", zIndex: 9999 };
                const gap = 12;

                switch (step.position) {
                    case "right":
                        style.top = rect.top + rect.height / 2 - 100; // Approximate centering vertically
                        style.left = rect.right + gap;
                        break;
                    case "left":
                        style.top = rect.top;
                        style.right = window.innerWidth - rect.left + gap;
                        break;
                    case "bottom":
                        style.top = rect.bottom + gap;
                        style.left = rect.left; // Align left edge
                        break;
                    case "top":
                        style.bottom = window.innerHeight - rect.top + gap;
                        style.left = rect.left;
                        break;
                    default:
                        style.top = rect.bottom + gap;
                        style.left = rect.left;
                }

                // Basic boundary check to keep it on screen
                if (style.left && typeof style.left === 'number') {
                    const popoverWidth = 350;
                    const windowWidth = window.innerWidth;

                    if (style.left < 10) {
                        style.left = 10;
                    } else if (style.left + popoverWidth > windowWidth - 10) {
                        // If it goes off the right edge, align to the right edge with some padding
                        style.left = windowWidth - popoverWidth - 10;
                    }
                }

                setPopoverStyle(style);
            }
        };

        updatePosition();
        window.addEventListener("resize", updatePosition);
        window.addEventListener("scroll", updatePosition, true);

        return () => {
            window.removeEventListener("resize", updatePosition);
            window.removeEventListener("scroll", updatePosition, true);
        };
    }, [currentStep, isOpen, filteredSteps]);

    const handleNext = () => {
        if (currentStep < filteredSteps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleFinish();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleFinish = () => {
        if (showOnStartup) {
            localStorage.removeItem("admin_onboarding_completed");
        } else {
            localStorage.setItem("admin_onboarding_completed", "true");
        }
        onClose();
    };

    if (!isOpen || filteredSteps.length === 0) return null;

    const step = filteredSteps[currentStep];
    if (!step) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9990] bg-black/50 transition-opacity duration-300">
            {/* Spotlight Effect */}
            {coords && (
                <div
                    className="absolute transition-all duration-300 ease-in-out shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] rounded-md pointer-events-none border-2 border-white/50"
                    style={{
                        top: coords.top - 4,
                        left: coords.left - 4,
                        width: coords.width + 8,
                        height: coords.height + 8,
                    }}
                />
            )}

            {/* Popover Card */}
            <Card className="w-[350px] shadow-xl animate-in fade-in zoom-in duration-300" style={popoverStyle}>
                <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                        <CardTitle className="text-lg text-[#0E3A4D]">{step.title}</CardTitle>
                        <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 -mt-2" onClick={handleFinish}>
                            <X size={14} />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="pb-4">
                    <p className="text-sm text-muted-foreground">{step.content}</p>
                </CardContent>
                <CardFooter className="flex flex-col gap-4 pt-0">
                    <div className="flex w-full justify-between items-center">
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="show-startup"
                                checked={showOnStartup}
                                onCheckedChange={setShowOnStartup}
                            />
                            <Label htmlFor="show-startup" className="text-xs font-normal text-muted-foreground cursor-pointer">
                                Mostrar ao entrar
                            </Label>
                        </div>
                        <div className="flex gap-1">
                            {filteredSteps.map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-1.5 w-1.5 rounded-full transition-colors ${i === currentStep ? "bg-[#1DB584]" : "bg-gray-200"
                                        }`}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="flex w-full justify-between gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleFinish}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            Pular
                        </Button>
                        <div className="flex gap-2">
                            {currentStep > 0 && (
                                <Button variant="outline" size="sm" onClick={handlePrev}>
                                    <ChevronLeft size={14} />
                                </Button>
                            )}
                            <Button size="sm" onClick={handleNext} className="bg-[#1DB584] hover:bg-[#15966d] text-white">
                                {currentStep === filteredSteps.length - 1 ? "Concluir" : "Próximo"}
                                {currentStep < filteredSteps.length - 1 && <ChevronRight size={14} className="ml-1" />}
                            </Button>
                        </div>
                    </div>
                </CardFooter>
            </Card>
        </div>,
        document.body
    );
}
