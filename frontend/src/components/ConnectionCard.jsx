// // src/components/ConnectionCard.jsx
// const ConnectionBadge = ({ environment }) => (
//   <div className={`card-badge ${environment === 'production' ? '' : 'development'}`}>
//     {environment === 'production' ? 'ПРОДАКШЕН' : 'РАЗРАБОТКА'}
//   </div>
// );
//
// const ConnectionCard = ({ conn }) => {
//   const getDbIcon = (type) => {
//     const icons = {
//       'MySQL': 'fas fa-database',
//       'PostgreSQL': 'fas fa-database',
//       'MongoDB': 'fas fa-leaf',
//       'Redis': 'fas fa-bolt',
//       'Oracle': 'fas fa-server'
//     };
//     return icons[type] || 'fas fa-database';
//   };
//
//   const getStatusClass = (status) => {
//     if (status === 'offline') return 'offline';
//     if (status === 'slow') return 'slow';
//     return '';
//   };
//
//   return (
//     <div className="connection-card">
//       <ConnectionBadge environment={conn.environment} />
//       <div className="card-header">
//         <div className={`db-avatar ${getStatusClass(conn.status)}`}>
//           <i className={getDbIcon(conn.database_type)}></i>
//         </div>
//         <div className="db-info">
//           <h3>{conn.name}</h3>
//           <p>{conn.database_type}</p>
//         </div>
//       </div>
//       <div className="card-details">
//         <div className="detail-item">
//           <span className="detail-label">База данных</span>
//           <span className="detail-value"><i className="fas fa-database"></i> {conn.database_name}</span>
//         </div>
//         <div className="detail-item">
//           <span className="detail-label">Хост</span>
//           <span className="detail-value"><i className="fas fa-server"></i> {conn.host}</span>
//         </div>
//         <div className="detail-item">
//           <span className="detail-label">Пользователь</span>
//           <span className="detail-value"><i className="fas fa-user"></i> {conn.username}</span>
//         </div>
//         <div className="detail-item">
//           <span className="detail-label">Порт</span>
//           <span className="detail-value"><i className="fas fa-plug"></i> {conn.port}</span>
//         </div>
//       </div>
//       <div className="card-footer">
//         <div className="connection-stats">
//           <div className="stat-item">
//             <div className="stat-label">Размер базы данных</div>
//             <div className="stat-value">{conn.db_size_mb ? `${conn.db_size_mb} MB` : '—'}</div>
//           </div>
//         </div>
//         <div className="card-actions">
//           <button className="favorite-action-btn" /* добавьте обработчик */>
//             <i className="far fa-star"></i>
//           </button>
//           <button className="action-btn" /* ping */><i className="fas fa-satellite-dish"></i></button>
//           <button className="action-btn" /* monitor */><i className="fas fa-chart-bar"></i></button>
//           <button className="action-btn delete" /* delete */><i className="fas fa-trash"></i></button>
//         </div>
//       </div>
//     </div>
//   );
// };
// export default ConnectionCard;