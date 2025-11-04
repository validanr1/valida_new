import { Card } from "@/components/ui/card";

type Props = {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  helperText?: string;
};

const StatCard = ({ title, value, icon, helperText }: Props) => {
  return (
    <Card className="flex items-center justify-between gap-4 p-4">
      <div className="space-y-1">
        <div className="text-sm text-muted-foreground">{title}</div>
        <div className="text-2xl font-bold">{value}</div>
        {helperText ? (
          <div className="text-xs text-muted-foreground">{helperText}</div>
        ) : null}
      </div>
      {icon ? (
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-muted text-muted-foreground">
          {icon}
        </div>
      ) : null}
    </Card>
  );
};

export default StatCard;