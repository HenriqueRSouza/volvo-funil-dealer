import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { DealerComparisonData, DealerMetrics } from '@/utils/dealerMetrics';

interface DealersComparisonProps {
  data: DealerComparisonData;
}

type SortField = 'dealerName' | 'leads' | 'testDrives' | 'sales' | 'leadsToTestDriveRate' | 'testDriveToSalesRate';
type SortDirection = 'asc' | 'desc';

export default function DealersComparison({ data }: DealersComparisonProps) {
  const [sortField, setSortField] = useState<SortField>('leads');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  const getPerformanceIndicator = (dealerValue: number, brValue: number, isPercentage = true) => {
    const threshold = isPercentage ? 0.5 : 1; // 0.5% for percentages, 1 for absolute numbers
    const difference = dealerValue - brValue;
    
    if (Math.abs(difference) < threshold) {
      return { icon: Minus, color: 'text-yellow-600', bgColor: 'bg-yellow-50', value: difference };
    } else if (difference > 0) {
      return { icon: TrendingUp, color: 'text-green-600', bgColor: 'bg-green-50', value: difference };
    } else {
      return { icon: TrendingDown, color: 'text-red-600', bgColor: 'bg-red-50', value: difference };
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedDealers = [...data.dealerMetrics].sort((a, b) => {
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    
    if (sortField === 'dealerName') {
      return multiplier * a.dealerName.localeCompare(b.dealerName, 'pt-BR');
    }
    
    return multiplier * (a[sortField] - b[sortField]);
  });

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSort(field)}
      className="h-auto p-1 font-medium text-xs hover:bg-accent/50"
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className="w-3 h-3" />
      </div>
    </Button>
  );

  const AbsoluteValueCell = ({ 
    dealerValue, 
    totalBrValue 
  }: {
    dealerValue: number;
    totalBrValue: number;
  }) => {
    const percentage = totalBrValue > 0 ? (dealerValue / totalBrValue) * 100 : 0;
    
    return (
      <div className="flex flex-col items-end gap-1">
        <span className="font-medium">{formatNumber(dealerValue)}</span>
        <span className="text-xs text-muted-foreground">
          {percentage.toFixed(1)}% do total BR
        </span>
      </div>
    );
  };

  const PerformanceCell = ({ 
    dealerValue, 
    brValue, 
    formatter = formatPercentage 
  }: {
    dealerValue: number;
    brValue: number;
    formatter?: (value: number) => string;
  }) => {
    const indicator = getPerformanceIndicator(dealerValue, brValue, true);
    const Icon = indicator.icon;
    
    return (
      <div className="flex flex-col items-end gap-1">
        <span className="font-medium">{formatter(dealerValue)}</span>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${indicator.bgColor}`}>
          <Icon className={`w-3 h-3 ${indicator.color}`} />
          <span className={`text-xs font-medium ${indicator.color}`}>
            {(indicator.value > 0 ? '+' : '') + indicator.value.toFixed(1) + 'pp'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <section>
      <Card className="funnel-card">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-foreground mb-2">
            Comparativo por Concessionária
          </h2>
          <p className="text-muted-foreground text-sm">
            Performance de cada dealer com participação no total BR e comparação nas taxas de conversão
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2">
                  <SortButton field="dealerName">Concessionária</SortButton>
                </th>
                <th className="text-right py-3 px-2">
                  <SortButton field="leads">Leads</SortButton>
                </th>
                <th className="text-right py-3 px-2">
                  <SortButton field="testDrives">Test Drives</SortButton>
                </th>
                <th className="text-right py-3 px-2">
                  <SortButton field="sales">Vendas</SortButton>
                </th>
                <th className="text-right py-3 px-2">
                  <SortButton field="leadsToTestDriveRate">Taxa Lead→TD</SortButton>
                </th>
                <th className="text-right py-3 px-2">
                  <SortButton field="testDriveToSalesRate">Taxa TD→Venda</SortButton>
                </th>
              </tr>
              
              {/* Linha de referência BR */}
              <tr className="bg-secondary/30 border-b border-border">
                <td className="py-2 px-2 font-medium text-primary">Total BR</td>
                <td className="text-right py-2 px-2 text-sm font-medium">{formatNumber(data.brMetrics.leads)}</td>
                <td className="text-right py-2 px-2 text-sm font-medium">{formatNumber(data.brMetrics.testDrives)}</td>
                <td className="text-right py-2 px-2 text-sm font-medium">{formatNumber(data.brMetrics.sales)}</td>
                <td className="text-right py-2 px-2 text-sm font-medium">{formatPercentage(data.brMetrics.leadsToTestDriveRate)}</td>
                <td className="text-right py-2 px-2 text-sm font-medium">{formatPercentage(data.brMetrics.testDriveToSalesRate)}</td>
              </tr>
            </thead>
            
            <tbody>
              {sortedDealers.map((dealer) => (
                <tr key={dealer.dealerName} className="border-b border-border/50 hover:bg-accent/20">
                  <td className="py-3 px-2 font-medium">{dealer.dealerName}</td>
                  <td className="text-right py-3 px-2">
                    <AbsoluteValueCell 
                      dealerValue={dealer.leads} 
                      totalBrValue={data.brMetrics.leads}
                    />
                  </td>
                  <td className="text-right py-3 px-2">
                    <AbsoluteValueCell 
                      dealerValue={dealer.testDrives} 
                      totalBrValue={data.brMetrics.testDrives}
                    />
                  </td>
                  <td className="text-right py-3 px-2">
                    <AbsoluteValueCell 
                      dealerValue={dealer.sales} 
                      totalBrValue={data.brMetrics.sales}
                    />
                  </td>
                  <td className="text-right py-3 px-2">
                    <PerformanceCell 
                      dealerValue={dealer.leadsToTestDriveRate} 
                      brValue={data.brMetrics.leadsToTestDriveRate}
                    />
                  </td>
                  <td className="text-right py-3 px-2">
                    <PerformanceCell 
                      dealerValue={dealer.testDriveToSalesRate} 
                      brValue={data.brMetrics.testDriveToSalesRate}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-green-600" />
              <span>Acima da média</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Minus className="w-3 h-3 text-yellow-600" />
              <span>Igual à média</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-red-600" />
              <span>Abaixo da média</span>
            </div>
          </div>
          <div>
            <span className="font-medium">pp</span> = pontos percentuais
          </div>
        </div>
      </Card>
    </section>
  );
}