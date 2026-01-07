// в компоненте HomePage.jsx
useEffect(() => {
  const fetchConnections = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/v1/db_connections/');
      setConnections(res.data.items);
    } catch (err) {
      console.error(err);
    }
  };
  fetchConnections();
}, []);