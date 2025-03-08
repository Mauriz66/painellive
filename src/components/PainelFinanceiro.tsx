import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import _ from 'lodash';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// Declare a extensão da interface Window para incluir a propriedade fs
declare global {
  interface Window {
    fs: {
      readFile: (path: string) => Promise<any>;
    };
  }
}

// Definição dos tipos de dados
interface MetricaPorMes {
  mes: string;
  totalValor: number;
  comissao: number;
  valorLiquido: number;
  totalPerguntasLive: number;
  totalPerguntasPrivadas: number;
  totalPerguntas: number;
  mediaValorPorPergunta: number;
  diasLive: number;
  mediaValorPorDia: number;
  totalClientes: number;
  crescimentoValor?: number;
  crescimentoPerguntas?: number;
}

interface MetricaPorDia {
  data: string;
  mes: string;
  totalValor: number;
  comissao: number;
  valorLiquido: number;
  totalPerguntasLive: number;
  totalPerguntasPrivadas: number;
  totalPerguntas: number;
  numeroClientes: number;
  valorMedioPorCliente: number;
}

interface EstatisticasGerais {
  totalValor: number;
  comissao: number;
  valorLiquido: number;
  totalPerguntasLive: number;
  totalPerguntasPrivadas: number;
  totalPerguntas: number;
  mediaValorPorPergunta: number;
  totalDiasLive: number;
  mediaValorPorDia: number;
  totalClientes: number;
  valorMedioPorCliente: number;
}

interface RegistroRow {
  'Dia que ocorreu a live': string;
  'Mes': string;
  ' Valor': number;
  'Numero de perguntas enviadas por cliente na live': number;
  'Numero de perguntas privadas enviadas por clientes na live'?: number;
  [key: string]: any;
}

interface NovoRegistro {
  data: string;
  mes: string;
  numeroCliente: number;
  valor: number;
  perguntasLive: number;
  perguntasPrivadas: number;
}

// Cores temáticas para gráficos
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// Configurações comuns para os gráficos
const chartConfig = {
  style: {
    background: '#fff',
    borderRadius: '0.5rem',
    padding: '1rem',
  },
};

// Cores personalizadas para os gráficos
const CHART_COLORS = {
  primary: '#0088FE',
  secondary: '#00C49F',
  accent: '#FFBB28',
  warning: '#FF8042',
  success: '#4CAF50',
  info: '#2196F3',
};

// Configuração do tooltip personalizado
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
        <p className="text-gray-600">{`Data: ${label}`}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="font-medium">
            {`${entry.name}: ${entry.value.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            })}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const PainelFinanceiro = () => {
  // Estados para armazenar dados e controlar funcionalidades
  const [dadosPorMes, setDadosPorMes] = useState<MetricaPorMes[]>([]);
  const [dadosPorDia, setDadosPorDia] = useState<MetricaPorDia[]>([]);
  const [estatisticasGerais, setEstatisticasGerais] = useState<EstatisticasGerais | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [tabAtiva, setTabAtiva] = useState('dashboard');
  const [periodoSelecionado, setPeriodoSelecionado] = useState('todos');
  const [novoRegistro, setNovoRegistro] = useState<NovoRegistro>({
    data: new Date().toISOString().split('T')[0],
    mes: '',
    numeroCliente: 1,
    valor: 15,
    perguntasLive: 1,
    perguntasPrivadas: 0
  });
  const [erro, setErro] = useState<string>('');

  // Efeito para carregar e processar os dados do Excel
  useEffect(() => {
    const carregarDados = async () => {
      try {
        setCarregando(true);
        setErro('');
        
        // Carregar o arquivo Excel da pasta pública
        const response = await fetch('/data/Controle Live 2025 2.xlsx');
        if (!response.ok) {
          throw new Error(`Erro ao carregar o arquivo Excel: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        if (!arrayBuffer || arrayBuffer.byteLength === 0) {
          throw new Error('Arquivo Excel vazio ou inválido');
        }
        
        // Processar o arquivo Excel
        const workbook = XLSX.read(new Uint8Array(arrayBuffer), {
          type: 'array',
          cellDates: true,
          cellNF: false,
          cellText: false
        });

        // Verificar se a planilha existe
        if (!workbook.SheetNames.includes("Registro 2025")) {
          throw new Error("Planilha 'Registro 2025' não encontrada no arquivo");
        }
        
        // Processar a planilha de registros
        const registroSheet = workbook.Sheets["Registro 2025"];
        let registroData = XLSX.utils.sheet_to_json<RegistroRow>(registroSheet, {
          raw: false,
          dateNF: 'yyyy-mm-dd'
        });
        
        // Filtrar e validar registros
        registroData = registroData.filter(row => {
          const isValid = 
            row["Dia que ocorreu a live"] && 
            row["Mes"] && 
            typeof row[" Valor"] !== 'undefined' &&
            !isNaN(parseFloat(String(row[" Valor"])));
          
          if (!isValid) {
            console.warn('Registro inválido encontrado:', row);
          }
          return isValid;
        });

        if (registroData.length === 0) {
          throw new Error("Nenhum dado válido encontrado na planilha");
        }

        // Normalizar os dados
        registroData = registroData.map(row => ({
          ...row,
          " Valor": parseFloat(String(row[" Valor"])),
          "Numero de perguntas enviadas por cliente na live": parseInt(String(row["Numero de perguntas enviadas por cliente na live"])) || 0,
          "Numero de perguntas privadas enviadas por clientes na live": parseInt(String(row["Numero de perguntas privadas enviadas por clientes na live"])) || 0
        }));
        
        // Processar dados
        processarDadosPorMes(registroData);
        processarDadosPorDia(registroData);
        calcularEstatisticasGerais(registroData);
        
        setCarregando(false);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        setCarregando(false);
        setErro(error instanceof Error ? error.message : "Erro ao carregar os dados do Excel");
      }
    };
    
    carregarDados();
  }, []);

  // Função para processar dados por mês
  const processarDadosPorMes = (registroData: RegistroRow[]) => {
    const mesesData = _.groupBy(registroData, 'Mes');
    
    const metricas: MetricaPorMes[] = [];
    for (const [mes, dados] of Object.entries(mesesData)) {
      const totalValor = _.sumBy(dados, ' Valor');
      const totalPerguntasLive = _.sumBy(dados, 'Numero de perguntas enviadas por cliente na live');
      const totalPerguntasPrivadas = _.sumBy(dados, (row) => 
        row['Numero de perguntas privadas enviadas por clientes na live'] || 0
      );
      
      // Calcular comissão (20% do valor bruto)
      const comissao = totalValor * 0.2;
      const valorLiquido = totalValor - comissao;
      
      // Calcular média de valor por pergunta
      const totalPerguntas = totalPerguntasLive + totalPerguntasPrivadas;
      const mediaValorPorPergunta = totalValor / totalPerguntas || 0;
      
      // Contar número de dias de live distintos
      const diasLive = _.uniqBy(dados, 'Dia que ocorreu a live').length;
      
      // Valor médio por dia de live
      const mediaValorPorDia = totalValor / diasLive;
      
      metricas.push({
        mes,
        totalValor,
        comissao,
        valorLiquido,
        totalPerguntasLive,
        totalPerguntasPrivadas,
        totalPerguntas,
        mediaValorPorPergunta,
        diasLive,
        mediaValorPorDia,
        totalClientes: dados.length
      });
    }
    
    // Ordenar meses cronologicamente
    const ordemMeses: Record<string, number> = {
      'janeiro': 1, 'fevereiro': 2, 'Fevereiro': 2, 'março': 3, 'abril': 4, 'maio': 5, 
      'junho': 6, 'julho': 7, 'agosto': 8, 'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12
    };
    
    metricas.sort((a, b) => {
      return ordemMeses[a.mes.toLowerCase()] - ordemMeses[b.mes.toLowerCase()];
    });
    
    // Calcular crescimento mês a mês
    if (metricas.length > 1) {
      for (let i = 1; i < metricas.length; i++) {
        const mesAtual = metricas[i];
        const mesAnterior = metricas[i-1];
        
        mesAtual.crescimentoValor = ((mesAtual.totalValor - mesAnterior.totalValor) / mesAnterior.totalValor) * 100;
        mesAtual.crescimentoPerguntas = ((mesAtual.totalPerguntas - mesAnterior.totalPerguntas) / mesAnterior.totalPerguntas) * 100;
      }
    }
    
    setDadosPorMes(metricas);
  };
  
  // Função para processar dados por dia
  const processarDadosPorDia = (registroData: RegistroRow[]) => {
    const diasLiveData = _.groupBy(registroData, 'Dia que ocorreu a live');
    
    const metricasPorDia: MetricaPorDia[] = [];
    for (const [dia, dados] of Object.entries(diasLiveData)) {
      const dataFormatada = new Date(dia).toISOString().split('T')[0];
      const mes = dados[0].Mes;
      const totalValor = _.sumBy(dados, ' Valor');
      const totalPerguntasLive = _.sumBy(dados, 'Numero de perguntas enviadas por cliente na live');
      const totalPerguntasPrivadas = _.sumBy(dados, (row) => 
        row['Numero de perguntas privadas enviadas por clientes na live'] || 0
      );
      const totalPerguntas = totalPerguntasLive + totalPerguntasPrivadas;
      
      // Calcular comissão (20% do valor bruto)
      const comissao = totalValor * 0.2;
      const valorLiquido = totalValor - comissao;
      
      metricasPorDia.push({
        data: dataFormatada,
        mes,
        totalValor,
        comissao,
        valorLiquido,
        totalPerguntasLive,
        totalPerguntasPrivadas,
        totalPerguntas,
        numeroClientes: dados.length,
        valorMedioPorCliente: totalValor / dados.length
      });
    }
    
    // Ordenar por data
    metricasPorDia.sort((a, b) => {
      return new Date(a.data).getTime() - new Date(b.data).getTime();
    });
    
    setDadosPorDia(metricasPorDia);
  };
  
  // Função para calcular estatísticas gerais
  const calcularEstatisticasGerais = (registroData: RegistroRow[]) => {
    const diasLiveData = _.groupBy(registroData, 'Dia que ocorreu a live');
    
    const totalValor = _.sumBy(registroData, ' Valor');
    const totalPerguntasLive = _.sumBy(registroData, 'Numero de perguntas enviadas por cliente na live');
    const totalPerguntasPrivadas = _.sumBy(registroData, (row) => 
      row['Numero de perguntas privadas enviadas por clientes na live'] || 0
    );
    const totalPerguntas = totalPerguntasLive + totalPerguntasPrivadas;
    
    // Calcular comissão (20% do valor bruto)
    const comissao = totalValor * 0.2;
    const valorLiquido = totalValor - comissao;
    
    const estatisticas: EstatisticasGerais = {
      totalValor,
      comissao,
      valorLiquido,
      totalPerguntasLive,
      totalPerguntasPrivadas,
      totalPerguntas,
      mediaValorPorPergunta: totalValor / totalPerguntas || 0,
      totalDiasLive: Object.keys(diasLiveData).length,
      mediaValorPorDia: totalValor / Object.keys(diasLiveData).length,
      totalClientes: registroData.length,
      valorMedioPorCliente: totalValor / registroData.length
    };
    
    setEstatisticasGerais(estatisticas);
  };
  
  // Função para filtrar dados por período
  const filtrarDadosPorPeriodo = () => {
    if (periodoSelecionado === 'todos') {
      return dadosPorDia;
    }
    
    const hoje = new Date();
    const dataInicio = new Date();
    
    switch (periodoSelecionado) {
      case '7dias':
        dataInicio.setDate(hoje.getDate() - 7);
        break;
      case '30dias':
        dataInicio.setDate(hoje.getDate() - 30);
        break;
      case '90dias':
        dataInicio.setDate(hoje.getDate() - 90);
        break;
      default:
        return dadosPorDia;
    }
    
    return dadosPorDia.filter(item => {
      const dataItem = new Date(item.data);
      return dataItem >= dataInicio && dataItem <= hoje;
    });
  };
  
  // Função para lidar com mudanças nos campos do formulário
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNovoRegistro(prev => ({
      ...prev,
      [name]: name === 'valor' || name === 'perguntasLive' || name === 'perguntasPrivadas' || name === 'numeroCliente' 
        ? parseFloat(value) 
        : value
    }));
  };
  
  // Função para adicionar novo registro
  const adicionarNovoRegistro = () => {
    // Validar dados
    if (!novoRegistro.data || !novoRegistro.mes || !novoRegistro.valor) {
      setErro("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    
    // Aqui seria o código para realmente adicionar o registro ao arquivo Excel
    // Como não podemos modificar o arquivo, apenas simulamos a adição
    
    setErro("Registro adicionado com sucesso! (Simulação - o arquivo real não foi modificado)");
    
    // Limpar o formulário
    setNovoRegistro({
      data: new Date().toISOString().split('T')[0],
      mes: '',
      numeroCliente: 1,
      valor: 15,
      perguntasLive: 1,
      perguntasPrivadas: 0
    });
    
    // Atualizar as estatísticas (simulação)
    setTimeout(() => setErro(""), 3000);
  };
  
  // Função para formatar valores monetários
  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };
  
  // Componente de Relatórios Detalhados
  const Relatorios = () => {
    return (
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">Relatórios Detalhados</h2>
        
        {/* Tabela de dados diários */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h3 className="text-lg font-semibold mb-4">Registro Diário</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-3 border-b">Data</th>
                  <th className="py-2 px-3 border-b">Mês</th>
                  <th className="py-2 px-3 border-b">Clientes</th>
                  <th className="py-2 px-3 border-b">Perguntas Live</th>
                  <th className="py-2 px-3 border-b">Perguntas Privadas</th>
                  <th className="py-2 px-3 border-b">Valor Bruto</th>
                  <th className="py-2 px-3 border-b">Comissão</th>
                  <th className="py-2 px-3 border-b">Valor Líquido</th>
                </tr>
              </thead>
              <tbody>
                {dadosPorDia.map((dia, index) => (
                  <tr key={`dia-${index}`}>
                    <td className="py-2 px-3 border-b">{dia.data}</td>
                    <td className="py-2 px-3 border-b">{dia.mes}</td>
                    <td className="py-2 px-3 border-b">{dia.numeroClientes}</td>
                    <td className="py-2 px-3 border-b">{dia.totalPerguntasLive}</td>
                    <td className="py-2 px-3 border-b">{dia.totalPerguntasPrivadas}</td>
                    <td className="py-2 px-3 border-b">{formatarValor(dia.totalValor)}</td>
                    <td className="py-2 px-3 border-b">{formatarValor(dia.comissao)}</td>
                    <td className="py-2 px-3 border-b">{formatarValor(dia.valorLiquido)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Análise de tendências */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h3 className="text-lg font-semibold mb-4">Análise de Tendências</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={dadosPorDia}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="data" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip formatter={(value, name: string | number) => {
                if (typeof name === 'string' && name.includes("Valor")) return formatarValor(value as number);
                return value;
              }} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="totalValor" name="Valor Bruto" stroke="#0088FE" />
              <Line yAxisId="left" type="monotone" dataKey="valorLiquido" name="Valor Líquido" stroke="#00C49F" />
              <Line yAxisId="right" type="monotone" dataKey="totalPerguntas" name="Total Perguntas" stroke="#FFBB28" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Análise por mês */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Comparativo Mensal</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={dadosPorMes}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip formatter={(value, name: string | number) => {
                if (typeof name === 'string' && name.includes("Valor")) return formatarValor(value as number);
                return value;
              }} />
              <Legend />
              <Bar yAxisId="left" dataKey="totalValor" name="Valor Bruto" fill="#0088FE" />
              <Bar yAxisId="left" dataKey="valorLiquido" name="Valor Líquido" fill="#00C49F" />
              <Bar yAxisId="right" dataKey="totalPerguntas" name="Total Perguntas" fill="#FFBB28" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };
  
  // Componente para adicionar novos registros
  const AdicionarRegistro = () => {
    return (
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">Adicionar Novo Registro</h2>
        
        <div className="bg-white p-6 rounded-lg shadow">
          {erro && (
            <div className={`p-3 mb-4 rounded ${erro.includes("sucesso") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {erro}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Data da Live*</label>
              <input
                type="date"
                name="data"
                value={novoRegistro.data}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Mês*</label>
              <select
                name="mes"
                value={novoRegistro.mes}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                required
              >
                <option value="">Selecione o mês</option>
                <option value="janeiro">Janeiro</option>
                <option value="fevereiro">Fevereiro</option>
                <option value="março">Março</option>
                <option value="abril">Abril</option>
                <option value="maio">Maio</option>
                <option value="junho">Junho</option>
                <option value="julho">Julho</option>
                <option value="agosto">Agosto</option>
                <option value="setembro">Setembro</option>
                <option value="outubro">Outubro</option>
                <option value="novembro">Novembro</option>
                <option value="dezembro">Dezembro</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Número do Cliente*</label>
              <input
                type="number"
                name="numeroCliente"
                value={novoRegistro.numeroCliente}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                min="1"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Valor*</label>
              <input
                type="number"
                name="valor"
                value={novoRegistro.valor}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                min="0"
                step="0.01"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Perguntas durante a Live</label>
              <input
                type="number"
                name="perguntasLive"
                value={novoRegistro.perguntasLive}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                min="0"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Perguntas Privadas</label>
              <input
                type="number"
                name="perguntasPrivadas"
                value={novoRegistro.perguntasPrivadas}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                min="0"
              />
            </div>
          </div>
          
          <button
            onClick={adicionarNovoRegistro}
            className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
          >
            Adicionar Registro
          </button>
        </div>
      </div>
    );
  };
  
  // Componente do Dashboard
  const Dashboard = () => {
    // Dados filtrados por período
    const dadosFiltrados = filtrarDadosPorPeriodo();
    
    // Calcular estatísticas do período filtrado
    const totalValorPeriodo = _.sumBy(dadosFiltrados, 'totalValor');
    const totalPerguntasPeriodo = _.sumBy(dadosFiltrados, 'totalPerguntas');
    const comissaoPeriodo = totalValorPeriodo * 0.2;
    const valorLiquidoPeriodo = totalValorPeriodo - comissaoPeriodo;
    
    // Dados para o gráfico de distribuição
    const dadosDistribuicao = [
      { name: 'Valor Líquido', value: valorLiquidoPeriodo },
      { name: 'Comissão', value: comissaoPeriodo }
    ];
    
    return (
      <div className="p-4">
        <div className="mb-6 bg-white p-4 rounded-lg shadow-md">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center">
              <label className="text-gray-700 font-medium mr-3">Filtrar por período:</label>
              <select 
                value={periodoSelecionado}
                onChange={(e) => setPeriodoSelecionado(e.target.value)}
                className="min-w-[200px] p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white shadow-sm"
              >
                <option value="todos">Todos os dados</option>
                <option value="7dias">Últimos 7 dias</option>
                <option value="30dias">Últimos 30 dias</option>
                <option value="90dias">Últimos 90 dias</option>
              </select>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <span className="mr-2">Período atual:</span>
              <span className="font-medium">
                {periodoSelecionado === 'todos' 
                  ? 'Todos os registros'
                  : `Últimos ${periodoSelecionado.replace('dias', ' dias')}`
                }
              </span>
            </div>
          </div>
        </div>
        
        {/* Cards com KPIs principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="stat-card">
            <h3 className="stat-title">Valor Bruto</h3>
            <p className="stat-value text-primary">{formatarValor(totalValorPeriodo)}</p>
          </div>
          
          <div className="stat-card">
            <h3 className="stat-title">Valor Líquido</h3>
            <p className="stat-value text-secondary">{formatarValor(valorLiquidoPeriodo)}</p>
          </div>
          
          <div className="stat-card">
            <h3 className="stat-title">Total de Perguntas</h3>
            <p className="stat-value text-accent">{totalPerguntasPeriodo}</p>
          </div>
          
          <div className="stat-card">
            <h3 className="stat-title">Dias de Live</h3>
            <p className="stat-value text-warning">{dadosFiltrados.length}</p>
          </div>
        </div>
        
        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Gráfico de Tendência de Valores por Dia */}
          <div className="chart-container">
            <h3 className="chart-title">Tendência de Valores por Dia</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dadosFiltrados}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis 
                  dataKey="data" 
                  tick={{ fill: '#666' }}
                  tickLine={{ stroke: '#666' }}
                />
                <YAxis 
                  tick={{ fill: '#666' }}
                  tickLine={{ stroke: '#666' }}
                  tickFormatter={(value) => formatarValor(value)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="totalValor" 
                  name="Valor Bruto" 
                  stroke={CHART_COLORS.primary}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS.primary }}
                  activeDot={{ r: 8 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="valorLiquido" 
                  name="Valor Líquido" 
                  stroke={CHART_COLORS.secondary}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS.secondary }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {/* Gráfico de Perguntas por Dia */}
          <div className="chart-container">
            <h3 className="chart-title">Perguntas por Dia</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dadosFiltrados}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis 
                  dataKey="data" 
                  tick={{ fill: '#666' }}
                  tickLine={{ stroke: '#666' }}
                />
                <YAxis 
                  tick={{ fill: '#666' }}
                  tickLine={{ stroke: '#666' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar 
                  dataKey="totalPerguntasLive" 
                  name="Perguntas Live" 
                  fill={CHART_COLORS.accent}
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="totalPerguntasPrivadas" 
                  name="Perguntas Privadas" 
                  fill={CHART_COLORS.warning}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Gráfico de Distribuição Valor Líquido vs Comissão */}
          <div className="chart-container">
            <h3 className="chart-title">Distribuição Valor Líquido vs Comissão</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dadosDistribuicao}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  innerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                >
                  {dadosDistribuicao.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index === 0 ? CHART_COLORS.success : CHART_COLORS.warning}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Gráfico de Valor Médio por Cliente */}
          <div className="chart-container">
            <h3 className="chart-title">Valor Médio por Cliente por Dia</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dadosFiltrados}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis 
                  dataKey="data" 
                  tick={{ fill: '#666' }}
                  tickLine={{ stroke: '#666' }}
                />
                <YAxis 
                  tick={{ fill: '#666' }}
                  tickLine={{ stroke: '#666' }}
                  tickFormatter={(value) => formatarValor(value)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="valorMedioPorCliente" 
                  name="Valor Médio por Cliente" 
                  stroke={CHART_COLORS.info}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS.info }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Tabela de Métricas por Mês */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h3 className="text-lg font-semibold mb-4">Métricas Mensais</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-4 border-b">Mês</th>
                  <th className="py-2 px-4 border-b">Valor Bruto</th>
                  <th className="py-2 px-4 border-b">Comissão</th>
                  <th className="py-2 px-4 border-b">Valor Líquido</th>
                  <th className="py-2 px-4 border-b">Total Perguntas</th>
                  <th className="py-2 px-4 border-b">Dias de Live</th>
                  <th className="py-2 px-4 border-b">Valor/Dia</th>
                  <th className="py-2 px-4 border-b">Crescimento</th>
                </tr>
              </thead>
              <tbody>
                {dadosPorMes.map((mes, index) => (
                  <tr key={`${mes.mes}-${index}`}>
                    <td className="py-2 px-4 border-b">{mes.mes}</td>
                    <td className="py-2 px-4 border-b">{formatarValor(mes.totalValor)}</td>
                    <td className="py-2 px-4 border-b">{formatarValor(mes.comissao)}</td>
                    <td className="py-2 px-4 border-b">{formatarValor(mes.valorLiquido)}</td>
                    <td className="py-2 px-4 border-b">{mes.totalPerguntas}</td>
                    <td className="py-2 px-4 border-b">{mes.diasLive}</td>
                    <td className="py-2 px-4 border-b">{formatarValor(mes.mediaValorPorDia)}</td>
                    <td className="py-2 px-4 border-b">
                      {mes.crescimentoValor ? `${mes.crescimentoValor.toFixed(2)}%` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Componente de mensagem de erro melhorado
  const MensagemErro = () => {
    if (!erro) return null;
    return (
      <div className="error-message mb-4">
        <div className="flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
          </svg>
          <div>
            <p className="font-bold">Erro ao carregar dados:</p>
            <p>{erro}</p>
            <p className="text-sm mt-1">Por favor, verifique se o arquivo Excel está na pasta correta e tente novamente.</p>
          </div>
        </div>
      </div>
    );
  };

  // Componente de loading melhorado
  const Loading = () => (
    <div className="loading">
      <div className="loading-spinner"></div>
      <p className="ml-4 text-lg text-gray-600">Carregando dados...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Cabeçalho e Navegação */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h1 className="text-3xl font-bold text-gray-900">Painel Financeiro de Lives</h1>
            <div className="flex space-x-4">
              <button 
                onClick={() => setTabAtiva('dashboard')}
                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                  tabAtiva === 'dashboard' 
                    ? 'bg-primary text-white shadow-lg' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Dashboard
              </button>
              <button 
                onClick={() => setTabAtiva('relatorios')}
                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                  tabAtiva === 'relatorios' 
                    ? 'bg-primary text-white shadow-lg' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Relatórios
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {erro && <MensagemErro />}
        
        {carregando ? (
          <Loading />
        ) : (
          <div className="space-y-6">
            {tabAtiva === 'dashboard' && <Dashboard />}
            {tabAtiva === 'relatorios' && <Relatorios />}
          </div>
        )}
      </main>
      
      {/* Rodapé */}
      <footer className="bg-white shadow-inner mt-auto py-4">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-600">
          <p>© {new Date().getFullYear()} Painel Financeiro de Lives</p>
        </div>
      </footer>
    </div>
  );
};

export default PainelFinanceiro;