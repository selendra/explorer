import { Card } from 'antd';
import React from 'react'
import { useParams } from 'react-router-dom';
import useFetch from '../../hooks/useFetch';
import { timeDuration } from '../../utils';

export default function ExtrinsicDetail() {
  const { id } = useParams();
  const { loading, data = [] } = useFetch(
    `${process.env.REACT_APP_API}/extrinsic/${id}`
  );
  console.log(data);

  if(loading) {
    return (
      <div className="container">
        <p>Loading</p>
      </div>
    )
  }

  return (
    <div className='container'>
      <div className='spacing' />
      <p className='block-title'>Extrinsic #{data?.blockNumber}-{data?.extrinsicIndex}</p>
      <Card className='block-detail-card' style={{borderRadius: '8px'}}>
        <table className='table'>
          <tbody>
            <tr>
              <td>Time</td>
              <td>{timeDuration(data?.timestamp)}</td>
            </tr>
            <tr>
              <td>Hash</td>
              <td>{data?.hash}</td>
            </tr>
            <tr>
              <td>Status</td>
              <td>
                { data?.success ?
                  <div>
                    <img src='/assets/icons/check.svg' alt='' width={18} height={18} />
                    <span>Success</span>
                  </div>
                  :
                  <img src='/assets/icons/x-circle.svg' alt='' width={18} height={18} />
                }
              </td>
            </tr>
            <tr>
              <td>Block Number</td>
              <td>#{data?.blockNumber}</td>
            </tr>
            <tr>
              <td>Extrinsic Index</td>
              <td>{data?.extrinsicIndex}</td>
            </tr>
            <tr>
              <td>Signed</td>
              <td>
                { data?.isSigned ?
                  <img src='/assets/icons/check.svg' alt='' width={18} height={18} />
                  :
                  <img src='/assets/icons/x-circle.svg' alt='' width={18} height={18} />
                }
              </td>
            </tr>
            <tr>
              <td>Signer</td>
              <td>{data?.signer || 'null'}</td>
            </tr>
            <tr>
              <td>Section and Method</td>
              <td>{data?.section} <img src='/assets/icons/arrow.svg' alt='' width={14} height={14} /> {data?.method}</td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  )
}
