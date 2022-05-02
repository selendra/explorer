import { Card } from 'antd';
import React from 'react'
import { useParams } from 'react-router-dom';
import useFetch from '../../hooks/useFetch';

export default function TransferDetail() {
  const {id} = useParams();

  const { loading, data = [] } = useFetch(
    `${process.env.REACT_APP_API}/transfer/${id}`
  );
  console.log(data);

  return (
    <div className='container'>
      <div className='spacing' />
      <p className='block-title'>Hash #{id}</p>
      <Card className='block-detail-card' style={{borderRadius: '8px'}}>
        <table className='table'>
          <tbody>
            <tr>
              <td>Time</td>
              <td>{data?.timestamp}</td>
            </tr>
            <tr>
              <td>Block</td>
              <td>#{data?.blockNumber}</td>
            </tr>
            <tr>
              <td>Sender</td>
              <td>{data?.source}</td>
            </tr>
            <tr>
              <td>Destination</td>
              <td>{data?.destination}</td>
            </tr>
            <tr>
              <td>Amount</td>
              <td>{data?.amount} SEL</td>
            </tr>
            <tr>
              <td>Fee</td>
              <td>{data?.feeAmount} SEL</td>
            </tr>
            <tr>
              <td>Result</td>
              <td>
                { data?.success ?
                  <div>
                    <img 
                      src='/assets/icons/check.svg'
                      alt=''
                      width={18}
                      height={18}
                    />
                    <span>Success</span>
                  </div>
                  :
                  <img 
                    src='/assets/icons/x-circle.svg'
                    alt=''
                    width={18}
                    height={18}
                  />
                }
              </td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  )
}
