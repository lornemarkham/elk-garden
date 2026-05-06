import type { CSSProperties } from 'react'

export const overlayStyles: Record<string, CSSProperties> = {
    header: {
        padding: '16px 20px',
        borderBottom: '1px solid #303030',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0
    },
    title: {
        margin: 0,
        fontSize: '16px',
        fontWeight: '700',
        color: '#fff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        letterSpacing: '-0.3px'
    },
    appStatus: {
        display: 'flex',
        gap: '12px',
        marginTop: '8px',
        fontSize: '11px'
    },
    healthBadge: {
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '10px',
        fontWeight: '700',
        color: '#fff'
    },
    uptimeText: {
        color: '#8c8c8c'
    },
    panelModeLine: {
        marginTop: '8px',
        fontSize: '11px',
        color: '#a3a3a3',
        lineHeight: 1.45,
    },
    panelModeLabel: {
        color: '#d9d9d9',
        fontWeight: 700,
    },
    headerButtons: {
        display: 'flex',
        gap: '8px'
    },
    smallButton: {
        padding: '6px 12px',
        backgroundColor: '#1f1f1f',
        border: '1px solid #303030',
        borderRadius: '6px',
        color: '#fff',
        fontSize: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    tabContainer: {
        display: 'flex',
        borderBottom: '2px solid #303030',
        backgroundColor: '#0f0f0f',
        flexShrink: 0,
        overflowX: 'auto',
        padding: '0 8px'
    },
    tab: {
        padding: '14px 18px',
        backgroundColor: 'transparent',
        border: 'none',
        borderBottom: '3px solid transparent',
        color: '#8c8c8c',
        fontSize: '12px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        whiteSpace: 'nowrap',
        position: 'relative'
    },
    tabActive: {
        padding: '14px 18px',
        backgroundColor: 'rgba(24, 144, 255, 0.08)',
        border: 'none',
        borderBottom: '3px solid #1890ff',
        color: '#1890ff',
        fontSize: '12px',
        fontWeight: '700',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        position: 'relative'
    },
    tabPanel: {
        backgroundColor: '#141414',
    },
    stats: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        padding: '16px',
        borderBottom: '1px solid #303030'
    },
    statBox: {
        textAlign: 'center',
        padding: '12px'
    },
    statLabel: {
        fontSize: '11px',
        color: '#8c8c8c',
        marginBottom: '4px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    },
    statValue: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#fff'
    },
    originBreakdown: {
        padding: '16px',
        borderBottom: '1px solid #303030'
    },
    originLabel: {
        fontSize: '12px',
        color: '#8c8c8c',
        marginBottom: '12px',
        fontWeight: '600'
    },
    originStats: {
        display: 'flex',
        gap: '16px'
    },
    originStat: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    originBadge: {
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: '700',
        color: '#fff'
    },
    originCount: {
        fontSize: '14px',
        fontWeight: '700',
        color: '#fff'
    },
    sloSection: {
        padding: '16px',
        borderBottom: '1px solid #303030'
    },
    sloHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '16px'
    },
    sloTitle: {
        fontSize: '14px',
        fontWeight: '700',
        color: '#fff',
        flex: 1
    },
    sloBadge: {
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: '700',
        color: '#fff'
    },
    violationBadge: {
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: '700',
        backgroundColor: '#ff4d4f',
        color: '#fff'
    },
    toggleButton: {
        padding: '4px 8px',
        backgroundColor: 'transparent',
        border: 'none',
        color: '#8c8c8c',
        cursor: 'pointer',
        fontSize: '12px'
    },
    sloMetrics: {
        maxHeight: 'none'
    },
    aiSection: {
        padding: '16px',
        borderBottom: '1px solid #303030'
    },
    aiExplainer: {
        padding: '14px 16px',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        marginBottom: '12px',
        border: '1px solid #e8e8e8',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
    },
    aiButton: {
        width: '100%',
        padding: '12px',
        backgroundColor: '#722ed1',
        border: 'none',
        borderRadius: '8px',
        color: '#fff',
        fontSize: '14px',
        fontWeight: '700',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    aiPanel: {
        marginTop: '16px',
        backgroundColor: '#1a1a1a',
        borderRadius: '8px',
        border: '1px solid #303030',
        overflow: 'hidden'
    },
    aiHeader: {
        padding: '12px 16px',
        backgroundColor: '#722ed1',
        color: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontWeight: '600',
        fontSize: '13px'
    },
    closeButton: {
        background: 'none',
        border: 'none',
        color: '#fff',
        fontSize: '16px',
        cursor: 'pointer',
        padding: '0 4px'
    },
    aiContent: {
        padding: '16px',
        fontSize: '12px',
        color: '#fff',
        fontFamily: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
        whiteSpace: 'pre-wrap',
        lineHeight: '1.6',
        maxHeight: '400px',
        overflow: 'auto'
    },
    callsList: {
        padding: '16px'
    },
    callsHeader: {
        fontSize: '14px',
        fontWeight: '700',
        color: '#fff',
        marginBottom: '12px'
    },
    callItem: {
        marginBottom: '8px',
        backgroundColor: '#1a1a1a',
        borderRadius: '6px',
        border: '1px solid #303030',
        overflow: 'hidden',
        transition: 'all 0.2s'
    },
    callHeader: {
        padding: '12px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    },
    callMethod: {
        display: 'flex',
        gap: '6px',
        minWidth: '140px'
    },
    methodBadge: {
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '10px',
        fontWeight: '700',
        color: '#fff'
    },
    callUrl: {
        flex: 1,
        minWidth: 0
    },
    baseUrl: {
        fontSize: '12px',
        color: '#fff',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
    },
    queryString: {
        fontSize: '10px',
        color: '#8c8c8c',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
    },
    callMeta: {
        display: 'flex',
        gap: '12px',
        alignItems: 'center'
    },
    statusBadge: {
        fontSize: '12px',
        fontWeight: '700'
    },
    durationBadge: {
        fontSize: '12px',
        fontWeight: '700'
    },
    expandIcon: {
        fontSize: '10px',
        color: '#8c8c8c'
    },
    callDetails: {
        padding: '12px',
        borderTop: '1px solid #303030',
        backgroundColor: '#0f0f0f'
    },
    detailRow: {
        fontSize: '11px',
        color: '#8c8c8c',
        marginBottom: '8px',
        lineHeight: '1.6'
    },
    codeBlock: {
        marginTop: '8px',
        padding: '8px',
        backgroundColor: '#1a1a1a',
        borderRadius: '4px',
        fontSize: '10px',
        color: '#52c41a',
        overflow: 'auto',
        fontFamily: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace'
    },
    emptyState: {
        textAlign: 'center',
        padding: '32px',
        color: '#8c8c8c',
        fontSize: '13px'
    },
    infoToggle: {
        padding: '6px 12px',
        backgroundColor: '#1f1f1f',
        border: '1px solid #303030',
        borderRadius: '6px',
        color: '#8c8c8c',
        fontSize: '11px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
    },
    infoBox: {
        marginTop: '16px',
        padding: '16px',
        backgroundColor: '#1a1a1a',
        borderRadius: '8px',
        border: '1px solid #303030',
        fontSize: '12px',
        lineHeight: '1.6'
    },
    infoTitle: {
        color: '#1890ff',
        fontWeight: '700',
        fontSize: '12px',
        marginTop: '12px',
        marginBottom: '6px'
    },
    infoText: {
        color: '#d9d9d9',
        fontSize: '12px',
        lineHeight: '1.7',
        marginBottom: '8px'
    },
    enableButton: {
        position: 'fixed',
        bottom: '5.5rem',
        right: '12px',
        zIndex: 9999
    },
    minimized: {
        position: 'fixed',
        bottom: '5.5rem',
        right: '12px',
        zIndex: 9999
    },
    minimizedLauncher: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 14px',
        backgroundColor: '#1f1f1f',
        border: '1px solid #434343',
        borderRadius: '9999px',
        color: '#f5f5f5',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
        transition: 'background-color 0.15s ease, border-color 0.15s ease',
    },
    minimizedCountBadge: {
        marginLeft: '2px',
        minWidth: '22px',
        padding: '2px 8px',
        borderRadius: '9999px',
        backgroundColor: '#303030',
        border: '1px solid #525252',
        color: '#fafafa',
        fontSize: '11px',
        fontWeight: '700',
        lineHeight: 1.3,
        textAlign: 'center',
    },
    button: {
        padding: '12px 24px',
        backgroundColor: '#1890ff',
        border: 'none',
        borderRadius: '8px',
        color: '#fff',
        fontSize: '14px',
        fontWeight: '700',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(24, 144, 255, 0.4)',
        transition: 'all 0.2s'
    }
};
