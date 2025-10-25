/**
 * ┌────────────────────────────────────────────────────────────────────────────
 * │ @author                    Nicolas Toro
 * ├────────────────────────────────────────────────────────────────────────────
 * │ @file           AdminStudentProfile.js
 * │ @path          client/src/pages/admin/AdminStudentProfile.js
 * │ @description   Admin view for a single student's profile (view-only)
 * │ @version       1.0.0
 * │
 * │ @date          2025-10-25
 * ├────────────────────────────────────────────────────────────────────────────
 * │ @copyright     (c) 2025 Nicolas Toro
 * └────────────────────────────────────────────────────────────────────────────
 */

import '../StudentProfile.css';
import './AdminPages.css';
import { toast } from 'react-toastify';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentService, pointService } from '../../services/api';
import useRandColor from '../../hook/useRandColor';

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const useChartHelpers = () => {
    const getCssVar = (name, fallback) => {
        try {
            const v = getComputedStyle(document.documentElement).getPropertyValue(name);
            return v ? v.trim() : fallback;
        } catch (e) {
            return fallback;
        }
    };

    const hexToRgba = (hex, alpha = 1) => {
        if (!hex) return `rgba(51,167,220,${alpha})`;
        const h = hex.trim();
        if (h.startsWith('rgb')) {
            if (h.startsWith('rgba')) return h;
            const nums = h.replace(/[^0-9,]/g, '').split(',').map(n => parseInt(n, 10));
            return `rgba(${nums[0]}, ${nums[1]}, ${nums[2]}, ${alpha})`;
        }
        let cleaned = h.replace('#', '');
        if (cleaned.length === 3) cleaned = cleaned.split('').map(c => c + c).join('');
        const int = parseInt(cleaned, 16);
        const r = (int >> 16) & 255;
        const g = (int >> 8) & 255;
        const b = int & 255;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const primary = getCssVar('--mantine-primary-color', '#33A7DC');
    return { primary, hexToRgba };
};

const AdminStudentProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [color] = useRandColor();
    const [loading, setLoading] = useState(true);
    const [student, setStudent] = useState(null);
    const [totalPoints, setTotalPoints] = useState(0);
    const [pointsHistory, setPointsHistory] = useState([]);

    const [chartData, setChartData] = useState({ labels: [], totals: [], meta: [] });
    const { primary, hexToRgba } = useChartHelpers();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const studentData = await studentService.getStudentById(id);
                setStudent(studentData);

                const pointsData = await pointService.getPointsHistory(id);
                // pointsData is expected to contain { history, totalPoints }
                const history = pointsData.history || [];
                setPointsHistory(history);
                setTotalPoints(pointsData.totalPoints ?? 0);

                const sorted = history.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                const labels = [];
                const totals = [];
                const meta = [];
                let cum = 0;
                for (const e of sorted) {
                    const gain = Number(e.value) || 0;
                    cum += gain;
                    const dt = new Date(e.createdAt);
                    const label = dt.toLocaleString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
                    labels.push(label);
                    totals.push(cum);
                    meta.push({ label, total: cum, gained: gain, reason: e.reason || '-', createdAt: e.createdAt });
                }
                setChartData({ labels, totals, meta });
            } catch (error) {
                console.error('\x1b[31mError loading student profile:\x1b[0m', error);
                toast.error('Error loading student profile');
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchData();
    }, [id]);

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading data...</p>
            </div>
        );
    }

    if (!student) {
        return (
            <div className="empty-message">
                <p>Student not found.</p>
                <button className="btn-cancel" onClick={() => navigate('/admin/students')}>Back</button>
            </div>
        );
    }

    const formatDate = (dateString) => {
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return new Date(dateString).toLocaleDateString('fr-FR', options);
    };

    const border = hexToRgba(primary, 1);
    const bg = hexToRgba(primary, 0.12);

    const lineData = {
        labels: chartData.labels,
        datasets: [
            {
                label: 'Total points',
                data: chartData.totals,
                fill: true,
                backgroundColor: bg,
                borderColor: border,
                pointBackgroundColor: border,
                pointRadius: 4,
                tension: 0.15,
            },
        ],
    };

    const lineOptions = {
        responsive: true,
        plugins: {
            legend: { position: 'top' },
            tooltip: {
                callbacks: {
                    title: (items) => {
                        const idx = items[0].dataIndex;
                        return chartData.meta[idx]?.label || '';
                    },
                    label: (context) => {
                        const idx = context.dataIndex;
                        const p = chartData.meta[idx];
                        if (!p) return '';
                        return [
                            `Total: ${p.total}`,
                            `Gained: ${p.gained > 0 ? '+' : ''}${p.gained}`,
                            `Reason: ${p.reason || '-'}`,
                        ];
                    },
                },
            },
        },
        scales: {
            x: { title: { display: true, text: 'Date' } },
            y: { title: { display: true, text: 'Total Points' }, beginAtZero: true },
        },
    };

    return (
        <div className="profile-container">
            <div className="profile-header">
                <h1>
                    Student Profile
                    <span style={{ color: `var(--mantine-color-${color}-7)` }}>_</span>
                </h1>
                <div className="user-card">
                    <div>
                        <h2 className="user-info">{student.firstName} {student.lastName}</h2>
                        <br />
                        <p className="user-info">{student.email}</p>
                    </div>
                    <div className="points-display">
                        <span className="points-value">{totalPoints}</span>
                        <span className="points-label">Points</span>
                    </div>
                </div>
            </div>

            <div className="points-history-section">
                <h2>Points History</h2>

                {pointsHistory && pointsHistory.length > 0 ? (
                    <div className="history-table-container">
                        {/* Chart above the table */}
                        {chartData.labels && chartData.labels.length > 0 && (
                            <div style={{ maxWidth: 900, margin: '0 auto 16px' }}>
                                <Line data={lineData} options={lineOptions} />
                            </div>
                        )}
                        <table className="history-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Points</th>
                                    <th>Reason</th>
                                    <th>Administrator</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pointsHistory.map((entry) => (
                                    <tr key={entry.id} className={entry.value >= 0 ? 'positive' : 'negative'}>
                                        <td>{formatDate(entry.createdAt)}</td>
                                        <td className="points-cell">
                                            {entry.value > 0 ? `+${entry.value}` : entry.value}
                                        </td>
                                        <td>{entry.reason || '-'}</td>
                                        <td>{entry.adminFirstName} {entry.adminLastName}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty-history-message">
                        <p>No points have been recorded for this student yet.</p>
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
                <button className="btn-cancel" onClick={() => navigate('/admin/students')}>Back to Students</button>
            </div>
        </div>
    );
};

export default AdminStudentProfile;
