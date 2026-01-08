import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { generateArduinoPrintStatement } from '@/lib/customSchemas';
import type { SensorMapping } from '@/types';

interface ViewSchemaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schema: SensorMapping | null;
}

export function ViewSchemaModal({ open, onOpenChange, schema }: ViewSchemaModalProps) {
  if (!schema) return null;

  const arduinoCode = generateArduinoPrintStatement(schema.format, schema.pattern, schema.fields);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-cyan-400">{schema.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {schema.description && (
            <div className="space-y-2">
              <Label className="text-cyan-400">Description</Label>
              <p className="text-sm text-foreground">{schema.description}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-cyan-400">Format</Label>
            <p className="text-sm text-foreground capitalize">{schema.format}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="regex-pattern" className="text-cyan-400">
              Regex Pattern
            </Label>
            <Textarea
              id="regex-pattern"
              readOnly
              value={schema.pattern}
              className="font-mono text-xs text-foreground bg-muted/50 [user-select:text] [pointer-events:auto]"
              rows={3}
              style={{ WebkitUserDrag: 'none' } as React.CSSProperties}
            />
            <p className="text-xs text-muted-foreground">
              Use this regex pattern to parse your sensor data.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="arduino-code" className="text-cyan-400">
              Arduino Print Statement
            </Label>
            <Textarea
              id="arduino-code"
              readOnly
              value={arduinoCode}
              className="font-mono text-xs text-foreground bg-muted/50 [user-select:text] [pointer-events:auto]"
              rows={3}
              style={{ WebkitUserDrag: 'none' } as React.CSSProperties}
            />
            <p className="text-xs text-muted-foreground">
              Use this as a reference for your Arduino sketch's Serial.print() statements.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-cyan-400">Fields</Label>
            <div className="space-y-2">
              {schema.fields.map((field, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-2 border rounded-md"
                >
                  <div
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: field.color }}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">{field.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {field.unit} • Group {field.captureGroup}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
