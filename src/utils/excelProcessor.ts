import * as XLSX from 'xlsx';

export interface FunnelMetrics {
  leadsDiretos: {
    leads: number;
    faturados: number;
  };
  leadsComTestDrive: {
    leads: number;
    testDrives: number;
  };
  testDrivesVendidos: {
    testDrives: number;
    vendas: number;
  };
  jornadaCompleta: {
    leads: number;
    faturados: number;
  };
  visitasTestDrive: {
    visitas: number;
    testDrives: number;
  };
  visitasFaturamento: {
    visitas: number;
    faturados: number;
  };
}

export interface RawSheetData {
  sheet1Data: any[];
  sheet2Data: any[];
  sheet3Data: any[];
  sheet4Data: any[];
  sheet5Data: any[];
}

export interface ProcessedData {
  avgLeadToTestDrive: number | null;
  avgTestDriveToFaturamento: number | null;
  avgTotalJourney: number | null;
  avgLeadToFaturamento: number | null;
  leads: number;
  testDrives: number;
  faturados: number;
  totalStoreVisits: number;
  decidedLeadsCount: number;
  decidedLeadsPercentage: number;
  leadsFaturadosCount: number;
  funnelMetrics: FunnelMetrics;
  period: {
    start: Date | null;
    end: Date | null;
  };
  rawData: RawSheetData;
  dealers: string[];
}

// Função auxiliar para buscar valores nas colunas
function getValue(row: any, possibleKeys: string[]): any {
  for (const key of possibleKeys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
      return row[key];
    }
  }
  return null;
}

// Função para normalizar nomes de dealers
function normalizeDealerName(dealerName: string): string {
  if (!dealerName) return '';

  return dealerName
    .trim()
    .replace(/\([^)]*\)/g, '') // Remove códigos entre parênteses como (462011)
    .toLowerCase()
    .normalize('NFD') // Decompõe caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '') // Remove os diacríticos (acentos)
    .replace(/\s+/g, ' ') // Normaliza espaços múltiplos para um só
    .trim();
}

function parseExcelDate(dateValue: any): Date | null {
  if (!dateValue) return null;

  const str = String(dateValue).trim();

  // Formato YYYY-MM-DD (ISO)
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  // Formato DD/MM/YYYY
  const ddmmyyyyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  // Tentar parseamento direto
  const n = Number(str);
  // caso seja número serial do Excel
  if (!isNaN(n) && n > 30000) {
    const date = new Date((n - 25569) * 86400 * 1000);
    return isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(str);
  return isNaN(date.getTime()) ? null : date;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR');
}

export function formatBrazilianNumber(value: number | null): string {
  if (value === null || value === undefined) return 'N/A';
  return Math.round(value).toLocaleString('pt-BR');
}

export function formatBrazilianPercent(value: number): string {
  return `${value.toFixed(1).replace('.', ',')}%`;
}

export async function processExcelFile(file: File): Promise<ProcessedData> {
  return new Promise((resolve, reject) => {
    console.info('🚀 Iniciando upload do arquivo:', file.name);

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        console.info('🔍 Iniciando processamento do arquivo:', file.name);

        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        console.info('📊 Abas encontradas na planilha:', workbook.SheetNames);

        if (workbook.SheetNames.length < 1) {
          throw new Error(`Nenhuma aba encontrada na planilha`);
        }

        // Processar as abas (esperado ao menos 3, mas suportamos 1..5)
        const sheet1Data: any[] = workbook.SheetNames[0]
          ? XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { raw: true })
          : [];
        const sheet2Data: any[] = workbook.SheetNames[1]
          ? XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[1]], { raw: true })
          : [];
        const sheet3Data: any[] = workbook.SheetNames[2]
          ? XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[2]], { raw: true })
          : [];
        const sheet4Data: any[] = workbook.SheetNames[3]
          ? XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[3]], { raw: true })
          : [];
        const sheet5Data: any[] = workbook.SheetNames[4]
          ? XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[4]], { raw: true })
          : [];

        console.info('📝 Dados encontrados:');
        console.info(`  - Sheet1 (Leads): ${sheet1Data.length} linhas`);
        console.info(`  - Sheet2 (Test Drives): ${sheet2Data.length} linhas`);
        console.info(`  - Sheet3 (Jornada Completa): ${sheet3Data.length} linhas`);
        console.info(`  - Sheet4 (Faturamentos): ${sheet4Data.length} linhas`);
        console.info(`  - Sheet5 (Visitas nas Lojas): ${sheet5Data.length} linhas`);

        if (sheet1Data.length === 0) {
          console.warn('⚠️ Nenhum dado encontrado na Sheet1 - prosseguindo mesmo assim');
        }

        // Extrair período de análise da coluna dateSales (sheet1)
        console.log('📊 Iniciando extração de datas...');
        const allDates: Date[] = [];

        sheet1Data.forEach((row, index) => {
          const dateValue = getValue(row, ['dateSales', 'Date', 'data', 'Data']);
          if (index < 3) {
            console.log(`Linha ${index}: dateSales =`, dateValue, typeof dateValue);
          }
          const parsed = parseExcelDate(dateValue);
          if (parsed) allDates.push(parsed);
        });

        console.log(`📅 Total de datas válidas: ${allDates.length}`);

        let periodStart: Date | null = null;
        let periodEnd: Date | null = null;

        if (allDates.length > 0) {
          allDates.sort((a, b) => a.getTime() - b.getTime());
          periodStart = allDates[0];
          periodEnd = allDates[allDates.length - 1];

          console.log(`📅 Período encontrado: ${formatDate(periodStart)} a ${formatDate(periodEnd)}`);
        } else {
          console.log('❌ Nenhuma data válida encontrada!');
        }

        // Extrair dealers únicos das abas
        const dealers = extractDealers(sheet1Data, sheet2Data, sheet3Data, sheet4Data);

        // Processar métricas
        const metrics = calculateMetrics(sheet1Data, sheet2Data, sheet3Data, sheet4Data, sheet5Data);

        // Criar resultado completo com período
        const result: ProcessedData = {
          ...metrics,
          period: {
            start: periodStart,
            end: periodEnd
          },
          rawData: {
            sheet1Data,
            sheet2Data,
            sheet3Data,
            sheet4Data,
            sheet5Data
          },
          dealers
        };

        console.info('✅ Processamento concluído com sucesso');

        resolve(result);
      } catch (error) {
        console.error('💥 Erro no processamento:', error);
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Erro ao ler o arquivo'));
    };

    reader.readAsArrayBuffer(file);
  });
}

function extractDealers(sheet1Data: any[], sheet2Data: any[], sheet3Data: any[], sheet4Data: any[]): string[] {
  const dealerMap = new Map<string, string>(); // normalized -> original

  console.info('🏢 Extraindo dealers de cada sheet:');

  // Função para adicionar dealer ao mapa com normalização
  const addDealer = (dealerName: string) => {
    if (dealerName && typeof dealerName === 'string' && dealerName.trim()) {
      const original = dealerName.trim();
      const normalized = normalizeDealerName(original);
      if (normalized && !dealerMap.has(normalized)) {
        dealerMap.set(normalized, original);
      }
    }
  };

  // Extrair dealers da Sheet1
  let sheet1Dealers = 0;
  sheet1Data.forEach(row => {
    const dealer = getValue(row, ['Dealer', 'dealer', 'Concessionaria', 'concessionaria', 'Concessionária', 'concessionária']);
    if (dealer) {
      addDealer(String(dealer));
      sheet1Dealers++;
    }
  });
  console.info(`  - Sheet1: ${sheet1Dealers} linhas com dealer`);

  let sheet2Dealers = 0;
  sheet2Data.forEach(row => {
    const raw = getValue(row, ['Dealer', 'dealer', 'Concessionaria', 'concessionaria', 'Concessionária', 'concessionária']);
    if (raw !== undefined && raw !== null) {
      const dealerStr = String(raw).trim();
      // validar plausibilidade: não é e-mail, não contém sequência longa de dígitos e tem tamanho mínimo
      if (dealerStr && !dealerStr.includes('@') && !/\d{3,}/.test(dealerStr) && dealerStr.length >= 3) {
        addDealer(dealerStr);
        sheet2Dealers++;
      }
    }
  });
  console.info(`  - Sheet2: ${sheet2Dealers} linhas com dealer`);

  // Extrair dealers da Sheet3
  let sheet3Dealers = 0;
  sheet3Data.forEach(row => {
    const dealer = getValue(row, ['Dealer', 'dealer', 'Concessionaria', 'concessionaria', 'Concessionária', 'concessionária']);
    if (dealer) {
      addDealer(String(dealer));
      sheet3Dealers++;
    }
  });
  console.info(`  - Sheet3: ${sheet3Dealers} linhas com dealer`);

  // Extrair dealers da Sheet4
  let sheet4Dealers = 0;
  sheet4Data.forEach(row => {
    const raw = getValue(row, ['Dealer', 'dealer', 'Concessionaria', 'concessionaria', 'Concessionária', 'concessionária']);
    if (raw !== undefined && raw !== null) {
      const dealerStr = String(raw).trim();
      if (dealerStr && !dealerStr.includes('@') && !/\d{3,}/.test(dealerStr) && dealerStr.length >= 3) {
        addDealer(dealerStr);
        sheet4Dealers++;
      }
    }
  });
  console.info(`  - Sheet4: ${sheet4Dealers} linhas com dealer`);

  const dealers = Array.from(dealerMap.values()).sort();
  console.info(`🏢 Total de dealers únicos encontrados: ${dealers.length}`);
  console.info(`🏢 Lista de dealers:`, dealers);

  return dealers;
}

function calculateMetrics(
  sheet1Data: any[],
  sheet2Data: any[],
  sheet3Data: any[],
  sheet4Data: any[] = [],
  sheet5Data: any[] = []
): Omit<ProcessedData, 'period' | 'rawData' | 'dealers'> {
  // Contadores básicos
  const totalLeads = sheet1Data.length;
  const totalTestDrives = sheet2Data.length;
  const totalJornadaCompleta = sheet3Data.length;
  const totalFaturamentos = sheet4Data.length;

  // Calcular total de visitas nas lojas (soma da coluna C da Sheet5)
  let totalStoreVisits = 0;
  if (sheet5Data && sheet5Data.length > 0) {
    sheet5Data.forEach(row => {
      const keys = Object.keys(row);
      const visitasValue = keys[2] ? row[keys[2]] : null; // Coluna C (índice 2)
      if (visitasValue !== null && visitasValue !== undefined && !isNaN(Number(visitasValue))) {
        totalStoreVisits += Number(visitasValue);
      }
    });
  }

  console.info('📊 Métricas calculadas:');
  console.info(`  - Sheet1 (Leads): ${totalLeads} linhas`);
  console.info(`  - Sheet2 (Test Drives): ${totalTestDrives} linhas`);
  console.info(`  - Sheet3 (Jornada Completa): ${totalJornadaCompleta} linhas`);
  console.info(`  - Sheet4 (Faturamentos): ${totalFaturamentos} linhas`);
  console.info(`  - Sheet5 (Visitas nas Lojas): ${totalStoreVisits} visitas`);

  // Análise Sheet1 - Leads
  const leadsWithTestDrive = sheet1Data.filter(row => {
    const flagTestDrive = getValue(row, ['Flag_TestDrive', 'flag_testdrive', 'flag_test_drive', 'FlagTestDrive']);
    return flagTestDrive === 1 || flagTestDrive === '1' || flagTestDrive === true;
  }).length;

  const leadsFaturados = sheet1Data.filter(row => {
    const flagFaturado = getValue(row, ['Flag_Faturado', 'flag_faturado', 'faturado', 'Faturado']);
    return flagFaturado === 1 || flagFaturado === '1' || flagFaturado === true;
  }).length;

  // Análise Sheet2 - Test Drives faturados
  const testDrivesFaturados = sheet2Data.filter(row => {
    const flagFaturado = getValue(row, ['Flag_Faturado', 'flag_faturado', 'faturado', 'Faturado']);
    return flagFaturado === 1 || flagFaturado === '1' || flagFaturado === true;
  }).length;

  // Leads diretos (faturados sem test drive)
  const leadsDiretos = sheet1Data.filter(row => {
    const flagFaturado = getValue(row, ['Flag_Faturado', 'flag_faturado', 'faturado', 'Faturado']);
    const flagTestDrive = getValue(row, ['Flag_TestDrive', 'flag_testdrive', 'flag_test_drive', 'FlagTestDrive']);
    const isFaturado = flagFaturado === 1 || flagFaturado === '1' || flagFaturado === true;
    const hasTestDrive = flagTestDrive === 1 || flagTestDrive === '1' || flagTestDrive === true;
    return isFaturado && !hasTestDrive;
  }).length;

  // Total de faturados - usar sheet4 se disponível, senão usar cálculo anterior
  const totalFaturados = totalFaturamentos > 0 ? totalFaturamentos : leadsFaturados + testDrivesFaturados;

  console.info('📊 Resultados:');
  console.info(`  - Leads com test drive: ${leadsWithTestDrive}`);
  console.info(`  - Leads faturados (Sheet1 flag): ${leadsFaturados}`);
  console.info(`  - Test drives faturados (Sheet2 flag): ${testDrivesFaturados}`);
  console.info(`  - Leads diretos (faturados sem TD): ${leadsDiretos}`);
  console.info(`  - Total faturados (final): ${totalFaturados}`);
  console.info('📊 Funil Test Drive → Faturados (Sheet2):');
  console.info(`  - Test Drives: ${totalTestDrives}`);
  console.info(`  - Vendas (flag Sheet2): ${testDrivesFaturados}`);

  // Métricas dos funis
  const funnelMetrics: FunnelMetrics = {
    leadsDiretos: {
      leads: totalLeads,
      faturados: leadsDiretos
    },
    leadsComTestDrive: {
      leads: totalLeads,
      testDrives: leadsWithTestDrive
    },
    testDrivesVendidos: {
      testDrives: totalTestDrives,
      vendas: testDrivesFaturados
    },
    jornadaCompleta: {
      leads: totalLeads,
      faturados: totalJornadaCompleta
    },
    visitasTestDrive: {
      visitas: totalStoreVisits,
      testDrives: totalTestDrives
    },
    visitasFaturamento: {
      visitas: totalStoreVisits,
      faturados: totalFaturados
    }
  };

  // Calcular médias de tempo
  const leadToTestDriveValues: number[] = [];
  const testDriveToFaturamentoValues: number[] = [];
  const leadToFaturamentoValues: number[] = []; // Apenas sheet1
  const totalJourneyValues: number[] = []; // Apenas sheet3

  // Sheet1 - tempos de lead direto para faturamento
  sheet1Data.forEach(row => {
    const tempoLeadFaturamento = getValue(row, ['Dias_Lead_Faturamento', 'dias_lead_faturamento', 'DiasLeadFaturamento']);
    if (tempoLeadFaturamento !== null && tempoLeadFaturamento !== undefined && !isNaN(Number(tempoLeadFaturamento))) {
      leadToFaturamentoValues.push(Number(tempoLeadFaturamento));
    }
    const tempoLeadTD = getValue(row, ['Dias_Lead_TestDrive', 'dias_lead_testdrive']);
    if (tempoLeadTD !== null && tempoLeadTD !== undefined && !isNaN(Number(tempoLeadTD))) {
      leadToTestDriveValues.push(Number(tempoLeadTD));
    }
  });

  // Sheet2 - tempos
  sheet2Data.forEach(row => {
    const tempoTestDriveFaturamento = getValue(row, ['Dias_TestDrive_Faturamento', 'dias_testdrive_faturamento']);
    if (tempoTestDriveFaturamento !== null && tempoTestDriveFaturamento !== undefined && !isNaN(Number(tempoTestDriveFaturamento))) {
      testDriveToFaturamentoValues.push(Number(tempoTestDriveFaturamento));
    }
  });

  // Sheet3 - tempos completos (jornada completa)
  sheet3Data.forEach(row => {
    const tempoLeadTD = getValue(row, ['Dias_Lead_TestDrive', 'dias_lead_testdrive']);
    const tempoTDFaturamento = getValue(row, ['Dias_TestDrive_Faturamento', 'dias_testdrive_faturamento']);
    const tempoTotal = getValue(row, ['Dias_Lead_Faturamento', 'dias_lead_faturamento']);

    if (tempoLeadTD !== null && tempoLeadTD !== undefined && !isNaN(Number(tempoLeadTD))) {
      leadToTestDriveValues.push(Number(tempoLeadTD));
    }
    if (tempoTDFaturamento !== null && tempoTDFaturamento !== undefined && !isNaN(Number(tempoTDFaturamento))) {
      testDriveToFaturamentoValues.push(Number(tempoTDFaturamento));
    }
    if (tempoTotal !== null && tempoTotal !== undefined && !isNaN(Number(tempoTotal))) {
      totalJourneyValues.push(Number(tempoTotal));
    }
  });

  // Calcular médias
  const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : null);

  const avgLeadToTestDrive = avg(leadToTestDriveValues);
  const avgTestDriveToFaturamento = avg(testDriveToFaturamentoValues);
  const avgLeadToFaturamento = avg(leadToFaturamentoValues);
  const avgTotalJourney = avg(totalJourneyValues);

  // Total de leads que faturaram (diretos + jornada completa)
  const totalLeadsFaturados = leadsFaturados + totalJornadaCompleta;

  // Leads decididos: dos leads que faturaram (direto + test drive), quantos decidiram em ≤10 dias
  let decidedLeadsCount = 0;
  [...sheet1Data, ...sheet3Data].forEach(row => {
    const tempoTotal = getValue(row, ['Dias_Lead_Faturamento', 'dias_lead_faturamento']);
    if (tempoTotal !== null && tempoTotal !== undefined && !isNaN(Number(tempoTotal)) && Number(tempoTotal) <= 10) {
      decidedLeadsCount++;
    }
  });

  const decidedLeadsPercentage = totalLeadsFaturados > 0 ? (decidedLeadsCount / totalLeadsFaturados) * 100 : 0;

  return {
    avgLeadToTestDrive,
    avgTestDriveToFaturamento,
    avgTotalJourney,
    avgLeadToFaturamento,
    leads: totalLeads,
    testDrives: totalTestDrives,
    faturados: totalFaturados,
    totalStoreVisits,
    decidedLeadsCount,
    decidedLeadsPercentage,
    leadsFaturadosCount: totalLeadsFaturados,
    funnelMetrics
  };
}

/**
 * Função que combina dados vindos de APIs (sheet1..sheet4) + um arquivo Excel (sheet5)
 * Retorna o mesmo ProcessedData.
 *
 * Observações:
 * - Ajuste as URLs das fetches abaixo conforme sua infra real.
 * - Esta função assume que cada endpoint retorna um array JSON compatível com as sheets.
 */
export async function processApiAndExcel(
  options?: { onStatusChange?: (status: "parcial" | "carregando" | "completo") => void },
  file?: File
): Promise<ProcessedData> {
  try {
    // Cache simples em memória
    const apiCache: Record<string, any> = {};

    const cachedFetch = async (key: string, url: string) => {
      if (apiCache[key]) return apiCache[key];
      const data = await fetch(url).then(r => r.json());
      apiCache[key] = data;
      return data;
    };
    // Substitua as URLs abaixo pelas suas reais
    const sheet1Url = 'https://prod-07.northcentralus.logic.azure.com:443/workflows/56ed58b37d6842c2b2477565c5852f52/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=J8NQbNHRdi_SZVjgx0eOGHE6WfaFkHDKcbeO8XB0Q3Y&tipo=leads';
    const sheet2Url = 'https://prod-07.northcentralus.logic.azure.com:443/workflows/56ed58b37d6842c2b2477565c5852f52/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=J8NQbNHRdi_SZVjgx0eOGHE6WfaFkHDKcbeO8XB0Q3Y&tipo=testdrive';
    const sheet3Url = 'https://prod-07.northcentralus.logic.azure.com:443/workflows/56ed58b37d6842c2b2477565c5852f52/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=J8NQbNHRdi_SZVjgx0eOGHE6WfaFkHDKcbeO8XB0Q3Y&tipo=geral';
    const sheet4Url = 'https://prod-07.northcentralus.logic.azure.com:443/workflows/56ed58b37d6842c2b2477565c5852f52/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=J8NQbNHRdi_SZVjgx0eOGHE6WfaFkHDKcbeO8XB0Q3Y&tipo=faturados';

    // Buscar dados das APIs em paralelo
    const [sheet1Raw, sheet2Raw, sheet3Raw, sheet4Raw] = await Promise.all([
      cachedFetch('sheet1', sheet1Url),
      cachedFetch('sheet2', sheet2Url),
      cachedFetch('sheet3', sheet3Url),
      cachedFetch('sheet4', sheet4Url)
    ]);

    const sheet1Data = sheet1Raw?.ResultSets?.Table1 ?? [];
    const sheet2Data = sheet2Raw?.ResultSets?.Table1 ?? [];
    const sheet3Data = sheet3Raw?.ResultSets?.Table1 ?? [];
    const sheet4Data = sheet4Raw?.ResultSets?.Table1 ?? [];

    // Sheet5 opcional: se não houver arquivo, manter vazio
    let sheet5Data: any[] = [];
    if (file) {
      sheet5Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const arr = workbook.SheetNames.length > 0
              ? XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]])
              : [];
            resolve(arr);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = err => reject(err);
        reader.readAsArrayBuffer(file);
      });
    }

    const dealers = extractDealers(sheet1Data, sheet2Data, sheet3Data, sheet4Data);
    const metrics = calculateMetrics(sheet1Data, sheet2Data, sheet3Data, sheet4Data, sheet5Data);

    const result: ProcessedData = {
      ...metrics,
      period: { start: null, end: null },
      rawData: { sheet1Data, sheet2Data, sheet3Data, sheet4Data, sheet5Data },
      dealers
    };

    return result;
  } catch (err) {
    console.error('Erro em processApiAndExcel:', err);
    throw err;
  }
}

// Novo: processamento somente da Sheet5 (visitas)
export async function processSheet5File(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet5 = workbook.SheetNames.length > 0
          ? XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]])
          : [];
        resolve(sheet5);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = err => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

