import { useState } from 'react';
import TransferTable from '../../components/TransferTable'
import useFetch from '../../hooks/useFetch';

export default function Transfers() {
  const [page, setPage] = useState(1);
  const { loading, data = [] } = useFetch(
    `${process.env.REACT_APP_API}/transfer/all/${page}`
  );
  console.log(data);

  return (
    <div>
      <div className='blocks-bg'>
        <div className='container'>
          <p className='blocks-title'>Transfers</p>
          <TransferTable 
            loading={loading}
            data={data}
            onChange={setPage}
          />
        </div>
      </div>
    </div>
  )
}
