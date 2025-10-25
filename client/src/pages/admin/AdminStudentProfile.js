/**
 * ┌────────────────────────────────────────────────────────────────────────────
 * │ @author                    Christophe Vandevoir
 * ├────────────────────────────────────────────────────────────────────────────
 * │ @file           AdminStudentProfile.js
 * │ @path          client/src/pages/admin/AdminStudentProfile.js
 * │ @description   Admin view for a single student's profile (view-only)
 * │ @version       1.0.0
 * │
 * │ @date          2025-10-25
 * ├────────────────────────────────────────────────────────────────────────────
 * │ @copyright     (c) 2025 Christophe Vandevoir
 * └────────────────────────────────────────────────────────────────────────────
 */

import '../StudentProfile.css';
import './AdminPages.css';
import { toast } from 'react-toastify';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentService, pointService } from '../../services/api';
import useRandColor from '../../hook/useRandColor';

const AdminStudentProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [color] = useRandColor();
    const [loading, setLoading] = useState(true);
    const [student, setStudent] = useState(null);
    const [totalPoints, setTotalPoints] = useState(0);
    const [pointsHistory, setPointsHistory] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const studentData = await studentService.getStudentById(id);
                setStudent(studentData);

                const pointsData = await pointService.getPointsHistory(id);
                // pointsData is expected to contain { history, totalPoints }
                setPointsHistory(pointsData.history || []);
                setTotalPoints(pointsData.totalPoints ?? 0);
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
