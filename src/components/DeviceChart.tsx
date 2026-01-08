import { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, GripVertical } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { DeviceChartData } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DeviceChartProps {
  data: DeviceChartData;
  dragHandleProps?: any;
}

export function DeviceChart({ data, dragHandleProps }: DeviceChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  if (!data.fields.length || !data.fields.some(f => f.data.length > 0)) {
    return null;
  }

  // Convert chart data to format expected by Recharts
  const chartData: any[] = [];
  const timestamps = new Set<number>();
  
  // Collect all unique timestamps
  data.fields.forEach(field => {
    field.data.forEach(point => {
      timestamps.add(point.timestamp);
    });
  });

  // Sort timestamps
  const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b);

  // Build data points for each timestamp
  sortedTimestamps.forEach(timestamp => {
    const point: any = {
      timestamp,
      time: new Date(timestamp).toLocaleTimeString(),
    };

    data.fields.forEach(field => {
      const dataPoint = field.data.find(d => d.timestamp === timestamp);
      if (dataPoint) {
        point[field.fieldName] = dataPoint.value;
      }
    });

    chartData.push(point);
  });

  const downloadCSV = () => {
    const headers = ['Time', ...data.fields.map(f => `${f.fieldName} (${f.unit})`)];
    const rows = chartData.map(point => [
      new Date(point.timestamp).toISOString(),
      ...data.fields.map(f => point[f.fieldName] ?? '')
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.sensorName}_${data.hubId}_${data.portId}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadImage = async (format: 'png' | 'jpg') => {
    if (!chartRef.current) return;
    
    const canvas = await html2canvas(chartRef.current, {
      backgroundColor: format === 'jpg' ? '#ffffff' : null,
      scale: 2
    });
    
    const url = canvas.toDataURL(`image/${format}`);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.sensorName}_${data.hubId}_${data.portId}_${Date.now()}.${format}`;
    a.click();
  };

  const downloadPDF = async () => {
    if (!chartRef.current) return;
    
    const canvas = await html2canvas(chartRef.current, {
      backgroundColor: '#ffffff',
      scale: 2
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height]
    });
    
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(`${data.sensorName}_${data.hubId}_${data.portId}_${Date.now()}.pdf`);
  };

  return (
    <Card ref={chartRef}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {dragHandleProps && (
              <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <CardTitle className="text-lg">
              {data.sensorName} - {data.hubId}:{data.portId}
            </CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={downloadCSV}>
                Download CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadImage('png')}>
                Download PNG
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadImage('jpg')}>
                Download JPG
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadPDF}>
                Download PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                border: '1px solid #333',
                borderRadius: '4px'
              }}
            />
            <Legend />
            {data.fields.map(field => (
              <Line
                key={field.fieldName}
                type="monotone"
                dataKey={field.fieldName}
                stroke={field.color}
                strokeWidth={2}
                dot={false}
                name={`${field.fieldName} (${field.unit})`}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
