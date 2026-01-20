// src/pages/AgreementPage.jsx
import React, {useState, useEffect} from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const AgreementPage = () => {
    const [agreements, setAgreements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAgreements = async () => {
            try {
                const token = localStorage.getItem('access_token');
                const headers = token ? {Authorization: `Bearer ${token}`} : {};

                const response = await fetch('http://localhost:8000/api/v1/app_agreements/', {
                    headers
                });

                if (!response.ok) {
                    throw new Error('Не удалось загрузить документы');
                }

                const data = await response.json();
                // Фильтруем активные и сортируем по number (как числа)
                const activeAgreements = data
                    .filter(item => item.is_active === true)
                    .sort((a, b) => {
                        const numA = parseInt(a.number, 10);
                        const numB = parseInt(b.number, 10);
                        return numA - numB;
                    });
                setAgreements(activeAgreements);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchAgreements();
    }, []);

    const isAuthenticated = !!localStorage.getItem('access_token');

    if (loading) {
        return (
            <>
                <Header isAuthenticated={isAuthenticated}/>
                <section className="agreement-section">
                    <div className="agreement-container">
                        <p>Загрузка документов...</p>
                    </div>
                </section>
                <Footer/>
            </>
        );
    }

    if (error) {
        return (
            <>
                <Header isAuthenticated={isAuthenticated}/>
                <section className="agreement-section">
                    <div className="agreement-container">
                        <div className="alert">
                            <p className="text-danger">Ошибка: {error}</p>
                        </div>
                    </div>
                </section>
                <Footer/>
            </>
        );
    }

    return (
        <>
            <Header isAuthenticated={isAuthenticated}/>
            <section className="agreement-section">
                <div className="agreement-container">
                    <div className="register-header">
                        <h1>Пользовательское соглашение</h1>
                    </div>

                    {agreements.length === 0 ? (
                        <p>Нет активных документов для отображения.</p>
                    ) : (
                        <div>
                            {agreements.map((item) => (
                                <div key={item.id}>
                                    <h2 className="section-title">{item.title}</h2>
                                    <div className="agreement-item">{item.content}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>
            <Footer/>
        </>
    );
};

export default AgreementPage;