import { useState, useEffect } from 'react';

const useFetch = (url = '', options = null, page) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    setLoading(true);
    fetch(url, options)
      .then(async(res) => {
        if(res.status === 404) {
          if (isMounted) {
            setData(null);
            setError('Data was no found!');
          }
        } else {
          const data = await res.json();
          if (isMounted) {
            setData(data);
            setError(null);
          }
        }
      })
      .catch(error => {
        if (isMounted) {
          setError(error);
          setData(null);
        }
      })
      .finally(() => isMounted && setLoading(false));

    return () => (isMounted = false);
  }, [url, options, page]);

  return { loading, error, data };
};

export default useFetch;