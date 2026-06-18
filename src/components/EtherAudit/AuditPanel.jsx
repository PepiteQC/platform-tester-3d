import { useState, useCallback }  from 'react';
import { useAuditStore }          from '../../store/auditStore';
import { useAuditWebSocket }      from '../../hooks/useAuditWebSocket';
import { CodeEditor }             from './CodeEditor';
import { ContractAnalysis }       from './ContractAnalysis';
import { MutationReport }         from './MutationReport';
import { ProgressStream }         from './ProgressStream';

const OPERATOR_OPTIONS = [
  { key: 'BCR', label: 'Boundary (BCR)',   color: '#3b82f6' },
  { key: 'AOR', label: 'Arithmetic (AOR)', color: '#f59e0b' },
  { key: 'BLR', label: 'Boolean (BLR)',    color: '#10b981' },
  { key: 'RQD', label: 'Require (RQD)',    color: '#ef4444' },
  { key: 'VCR', label: 'Visibility (VCR)', color: '#8b5cf6' },
];

export function AuditPanel() {
  const {
    sourceCode, setSourceCode,
    fileName, setFileName,
    framework, setFramework,
    operators, setOperators,
    compiled, analysis, mutants, report,
    progress, error,
    compile, analyze, generateMutants,
    handleWsEvent, setWsStatus,
  } = useAuditStore();

  const [activeTab, setActiveTab] = useState('editor'); // editor | analysis | mutants | report
  const [isLoading, setIsLoading] = useState(false);

  // WebSocket
  const handleEvent = useCallback((msg) => {
    handleWsEvent(msg);
    if (msg.event === 'JOB_COMPLETED') setActiveTab('report');
  }, [handleWsEvent]);

  const { status: wsStatus } = useAuditWebSocket(handleEvent);

  // ── Actions séquentielles ──────────────────────────────────────────────────
  const handleCompileAndAnalyze = async () => {
    setIsLoading(true);
    try {
      await compile();
      await analyze();
      setActiveTab('analysis');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateMutants = async () => {
    setIsLoading(true);
    try {
      await generateMutants();
      setActiveTab('mutants');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleOperator = (key) => {
    setOperators(
      operators.includes(key)
        ? operators.filter(o => o !== key)
        : [...operators, key]
    );
  };

  return (
    <div style={styles.container}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>🔬 EtherAudit</span>
          <span style={styles.subtitle}>Mutation Testing for Solidity</span>
        </div>
        <div style={styles.headerRight}>
          <WsIndicator status={wsStatus} />
        </div>
      </div>

      {/* ── Config Bar ─────────────────────────────────────────────────────── */}
      <div style={styles.configBar}>
        <input
          style={styles.fileInput}
          value={fileName}
          onChange={e => setFileName(e.target.value)}
          placeholder="MyContract.sol"
        />

        <select
          style={styles.select}
          value={framework}
          onChange={e => setFramework(e.target.value)}
        >
          <option value="foundry">🔨 Foundry</option>
          <option value="hardhat">⛑ Hardhat</option>
        </select>

        <div style={styles.operatorGroup}>
          {OPERATOR_OPTIONS.map(op => (
            <button
              key={op.key}
              style={{
                ...styles.opBtn,
                background: operators.includes(op.key) ? op.color : 'transparent',
                borderColor: op.color,
                color: operators.includes(op.key) ? '#fff' : op.color,
              }}
              onClick={() => toggleOperator(op.key)}
            >
              {op.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div style={styles.tabs}>
        {[
          { id: 'editor',   label: '📝 Éditeur' },
          { id: 'analysis', label: `🔎 Analyse ${analysis ? `(${analysis.contracts.length})` : ''}` },
          { id: 'mutants',  label: `🧬 Mutants ${mutants.length > 0 ? `(${mutants.length})` : ''}` },
          { id: 'report',   label: `📊 Rapport ${report ? `(${report.mutationScore}%)` : ''}` },
        ].map(tab => (
          <button
            key={tab.id}
            style={{ ...styles.tab, ...(activeTab === tab.id ? styles.tabActive : {}) }}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div style={styles.content}>
        {error && (
          <div style={styles.errorBanner}>
            ⚠️ {error}
          </div>
        )}

        {activeTab === 'editor' && (
          <CodeEditor
            value={sourceCode}
            onChange={setSourceCode}
            fileName={fileName}
          />
        )}
        {activeTab === 'analysis' && <ContractAnalysis analysis={analysis} />}
        {activeTab === 'mutants'  && <MutantsView mutants={mutants} />}
        {activeTab === 'report'   && <MutationReport report={report} />}
      </div>

      {/* ── Progress Bar ───────────────────────────────────────────────────── */}
      {progress.phase === 'running' && (
        <ProgressStream progress={progress} />
      )}

      {/* ── Action Bar ─────────────────────────────────────────────────────── */}
      <div style={styles.actionBar}>
        <ActionButton
          onClick={handleCompileAndAnalyze}
          disabled={!sourceCode || isLoading}
          loading={isLoading && progress.phase === 'compiling'}
          label="1. Compiler & Analyser"
          color="#3b82f6"
        />
        <ActionButton
          onClick={handleGenerateMutants}
          disabled={!analysis || isLoading}
          loading={isLoading && progress.phase === 'mutating'}
          label="2. Générer Mutants"
          color="#f59e0b"
        />
        <ActionButton
          onClick={() => {/* Lance le runner via API */}}
          disabled={mutants.length === 0 || isLoading || progress.phase === 'running'}
          loading={progress.phase === 'running'}
          label="3. Lancer les Tests"
          color="#10b981"
        />
      </div>
    </div>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────────────────

function WsIndicator({ status }) {
  const colors = { connected: '#10b981', disconnected: '#ef4444', reconnecting: '#f59e0b' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: colors[status] || '#6b7280',
        boxShadow: status === 'connected' ? `0 0 6px ${colors.connected}` : 'none',
      }} />
      <span style={{ fontSize: 11, color: '#9ca3af' }}>WS {status}</span>
    </div>
  );
}

function ActionButton({ onClick, disabled, loading, label, color }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        padding:      '10px 20px',
        background:   disabled ? '#374151' : color,
        color:        disabled ? '#6b7280' : '#fff',
        border:       'none',
        borderRadius: 8,
        cursor:       disabled ? 'not-allowed' : 'pointer',
        fontWeight:   600,
        fontSize:     14,
        transition:   'all 0.2s',
        opacity:      loading ? 0.7 : 1,
      }}
    >
      {loading ? '⏳ ...' : label}
    </button>
  );
}

function MutantsView({ mutants }) {
  const statusColors = {
    pending:  '#6b7280',
    killed:   '#10b981',
    survived: '#ef4444',
    timeout:  '#f59e0b',
    error:    '#8b5cf6',
  };
  return (
    <div style={{ padding: 16, overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'grid', gap: 8 }}>
        {mutants.map(m => (
          <div key={m.id} style={{
            background: '#1f2937', borderRadius: 8,
            padding: 12, borderLeft: `4px solid ${statusColors[m.status]}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#e5e7eb' }}>{m.id}</span>
              <span style={{ fontSize: 11, color: statusColors[m.status], fontWeight: 700,
                background: `${statusColors[m.status]}22`, padding: '2px 8px', borderRadius: 4 }}>
                {m.status.toUpperCase()}
              </span>
            </div>
            <p style={{ color: '#9ca3af', fontSize: 13, margin: '6px 0 0' }}>{m.description}</p>
          </div>
        ))}
        {mutants.length === 0 && (
          <div style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>
            Aucun mutant généré. Compilez et analysez d'abord votre contrat.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  container:   { display: 'flex', flexDirection: 'column', height: '100vh', background: '#111827', color: '#f9fafb', fontFamily: 'system-ui' },
  header:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', background: '#1f2937', borderBottom: '1px solid #374151' },
  headerLeft:  { display: 'flex', alignItems: 'center', gap: 12 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 12 },
  logo:        { fontSize: 20, fontWeight: 800 },
  subtitle:    { color: '#9ca3af', fontSize: 13 },
  configBar:   { display: 'flex', gap: 12, padding: '10px 20px', background: '#1f2937', borderBottom: '1px solid #374151', flexWrap: 'wrap', alignItems: 'center' },
  fileInput:   { padding: '6px 12px', background: '#374151', border: '1px solid #4b5563', borderRadius: 6, color: '#f9fafb', fontSize: 13, width: 180 },
  select:      { padding: '6px 12px', background: '#374151', border: '1px solid #4b5563', borderRadius: 6, color: '#f9fafb', fontSize: 13 },
  operatorGroup: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  opBtn:       { padding: '4px 12px', borderRadius: 20, border: '1.5px solid', cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.15s' },
  tabs:        { display: 'flex', gap: 0, background: '#1f2937', borderBottom: '1px solid #374151' },
  tab:         { padding: '10px 20px', background: 'none', border: 'none', borderBottom: '2px solid transparent', color: '#9ca3af', cursor: 'pointer', fontSize: 14, transition: 'all 0.15s' },
  tabActive:   { color: '#f9fafb', borderBottomColor: '#3b82f6' },
  content:     { flex: 1, overflow: 'hidden', position: 'relative' },
  actionBar:   { display: 'flex', gap: 12, padding: '12px 20px', background: '#1f2937', borderTop: '1px solid #374151' },
  errorBanner: { margin: 12, padding: '10px 16px', background: '#7f1d1d', borderRadius: 8, border: '1px solid #ef4444', color: '#fca5a5', fontSize: 13 },
};