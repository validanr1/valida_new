import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Info, CheckCircle2 } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend
} from "recharts";

const sampleData = [
  { name: "Jan", a: 12, b: 22 },
  { name: "Feb", a: 18, b: 28 },
  { name: "Mar", a: 30, b: 20 },
  { name: "Apr", a: 26, b: 18 },
];

const UiKit: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [progress, setProgress] = useState(42);
  const [selectVal, setSelectVal] = useState<string | undefined>(undefined);

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold">UI Kit</h1>
        <p className="text-sm text-muted-foreground">Componentes básicos e exemplos de gráficos.</p>
      </div>

      {/* Botões, Input, Select */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Controles</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primário</Button>
          <Button variant="outline">Secundário</Button>
          <Button variant="destructive">Perigo</Button>
          <Input placeholder="Digite algo..." className="w-56" />
          <Select value={selectVal} onValueChange={setSelectVal}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Opção 1</SelectItem>
              <SelectItem value="2">Opção 2</SelectItem>
            </SelectContent>
          </Select>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost"><Info className="h-4 w-4" /></Button>
              </TooltipTrigger>
              <TooltipContent>Tooltip de exemplo</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </Card>

      {/* Dialogs */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Modais</h2>
        <div className="flex items-center gap-3">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button>Dialog</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Título do Dialog</DialogTitle>
              </DialogHeader>
              <div className="text-sm">Conteúdo do dialog.</div>
              <DialogFooter>
                <Button onClick={() => setOpen(false)}>Fechar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
            <Button onClick={() => setAlertOpen(true)} variant="outline">AlertDialog</Button>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirma?</AlertDialogTitle>
                <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction>Confirmar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Card>

      {/* Tabela e Progresso */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Tabela e Progresso</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Item A</TableCell>
                  <TableCell><span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-4 w-4"/>Ativo</span></TableCell>
                  <TableCell className="text-right"><Button size="sm" variant="outline">Editar</Button></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Item B</TableCell>
                  <TableCell>Inativo</TableCell>
                  <TableCell className="text-right"><Button size="sm" variant="outline">Editar</Button></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <div className="space-y-2">
            <div className="text-sm">Progresso ({progress}%)</div>
            <Progress value={progress} />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setProgress((p) => Math.max(0, p-10))}>-10%</Button>
              <Button size="sm" onClick={() => setProgress((p) => Math.min(100, p+10))}>+10%</Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs e Gráficos */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Gráficos (exemplos)</h2>
        <Tabs defaultValue="bar">
          <TabsList>
            <TabsTrigger value="bar">Barras</TabsTrigger>
            <TabsTrigger value="line">Linhas</TabsTrigger>
            <TabsTrigger value="area">Área</TabsTrigger>
          </TabsList>
          <TabsContent value="bar">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sampleData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RTooltip />
                  <Legend />
                  <Bar dataKey="a" fill="#1DB584" radius={[4,4,0,0]} name="Série A" />
                  <Bar dataKey="b" fill="#0E3A4D" radius={[4,4,0,0]} name="Série B" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          <TabsContent value="line">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sampleData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="a" stroke="#1DB584" name="Série A" />
                  <Line type="monotone" dataKey="b" stroke="#0E3A4D" name="Série B" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          <TabsContent value="area">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sampleData}>
                  <defs>
                    <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1DB584" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#1DB584" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="gradB" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0E3A4D" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#0E3A4D" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RTooltip />
                  <Legend />
                  <Area type="monotone" dataKey="a" stroke="#1DB584" fill="url(#gradA)" name="Série A" />
                  <Area type="monotone" dataKey="b" stroke="#0E3A4D" fill="url(#gradB)" name="Série B" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default UiKit;
