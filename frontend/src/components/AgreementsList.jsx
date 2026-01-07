// // src/components/AgreementsList.jsx
// import React, { useState, useEffect } from 'react';
//
// const AgreementsList = () => {
//   const [agreements, setAgreements] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//
//   useEffect(() => {
//     const fetchAgreements = async () => {
//       try {
//         const response = await fetch('http://localhost:8000/api/v1/agreements');
//         if (!response.ok) {
//           throw new Error(`HTTP error! Status: ${response.status}`);
//         }
//         const data = await response.json();
//         setAgreements(data);
//       } catch (err) {
//         setError(err.message);
//       } finally {
//         setLoading(false);
//       }
//     };
//
//     fetchAgreements();
//   }, []);
//
//   if (loading) return <p>Загрузка соглашений...</p>;
//   if (error) return <p>Ошибка: {error}</p>;
//
//   return (
//     <div>
//       <h2>Пользовательские соглашения</h2>
//       {agreements.length === 0 ? (
//         <p>Соглашений не найдено.</p>
//       ) : (
//         <ul>
//           {agreements.map((agreement) => (
//             <li key={agreement.id}>
//               <strong>{agreement.title}</strong>
//               <p>{agreement.content}</p>
//             </li>
//           ))}
//         </ul>
//       )}
//     </div>
//   );
// };
//
// export default AgreementsList;