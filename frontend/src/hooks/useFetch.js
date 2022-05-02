import { useState, useEffect } from 'react';
import { useAPIState } from '../context/APIContext';

const useFetch = (url = '', options = null, page) => {
  const { api } = useAPIState();
  const [blockNumber, setBlockNumber] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const bestNumber = api.derive.chain.bestNumber;

  useEffect(() => {
    let unsubscribeAll = null

    bestNumber(number => {
      // Append `.toLocaleString('en-US')` to display a nice thousand-separated digit.
      setBlockNumber(number.toNumber().toLocaleString('en-US'))
    })
      .then(unsub => {
        unsubscribeAll = unsub
      })
      .catch(console.error)

    return () => unsubscribeAll && unsubscribeAll()
  }, [bestNumber])

  useEffect(() => {
    let isMounted = true;

    setLoading(true);
    fetch(url, options)
      .then(res => res.json())
      .then(data => {
        if (isMounted) {
          setData(data);
          setError(null);
        }
      })
      .catch(error => {
        if (isMounted) {
          setError(error);
          setData(null);
        }
      })
      .finally(() => setLoading(false));

    return () => (isMounted = false);
  }, [url, options, page, blockNumber]);

  return { loading, error, data };
};

export default useFetch;