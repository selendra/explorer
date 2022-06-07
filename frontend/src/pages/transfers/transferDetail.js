import { Card, message, notification } from "antd";
import React from "react";
import { useParams } from "react-router-dom";
import Loading from "../../components/Loading";
import useFetch from "../../hooks/useFetch";
import { formatNumber } from "../../utils";
import { CopyOutlined } from "@ant-design/icons";
import Moment from "react-moment";

export default function TransferDetail() {
  const { id } = useParams();
  const { loading, data = [] } = useFetch(
    `${process.env.REACT_APP_API}/transfer/${id}`
  );

  if (loading)
    return (
      <div className="container">
        <Loading />
      </div>
    );

  return (
    <div className="container">
      <div className="spacing" />
      <p className="block-title">
        Hash #{id}{" "}
        <CopyOutlined
          style={{ fontSize: "20px", marginTop: "8px" }}
          onClick={() =>
            navigator.clipboard.writeText(id).then(() =>
              notification.success(
                {
                  message: "Copied",
                },
                3
              )
            )
          }
        />
      </p>
      <Card className="block-detail-card" style={{ borderRadius: "8px" }}>
        <table className="table">
          <tbody>
            <tr className="tr-style">
              <td>Time</td>
              <td>
                <Moment>{data?.timestamp}</Moment>
              </td>
            </tr>
            <tr className="tr-style">
              <td>Block</td>
              <td>#{formatNumber(data?.blockNumber)}</td>
            </tr>
            <tr className="tr-style">
              <td>Sender</td>
              <td>{data?.source}</td>
              <CopyOutlined
                style={{ fontSize: "20px", marginTop: "16px" }}
                onClick={() =>
                  navigator.clipboard.writeText(data?.source).then(() =>
                    notification.success({
                      message: "Copied",
                    })
                  )
                }
              />
            </tr>
            <tr className="tr-style">
              <td>Destination</td>
              <td>{data?.destination}</td>
              <CopyOutlined
                style={{ fontSize: "20px", marginTop: "16px" }}
                onClick={() =>
                  navigator.clipboard.writeText(data?.destination).then(() =>
                    notification.success({
                      message: "Copied",
                    })
                  )
                }
              />
            </tr>
            <tr className="tr-style">
              <td>Amount</td>
              <td>{formatNumber(data?.amount)} SEL</td>
            </tr>
            <tr className="tr-style">
              <td>Fee</td>
              <td>{data?.feeAmount} SEL</td>
            </tr>
            <tr className="tr-style">
              <td>Result</td>
              <td>
                {data?.success ? (
                  <div>
                    <img
                      src="/assets/icons/check.svg"
                      alt=""
                      width={18}
                      height={18}
                    />
                    <span>Success</span>
                  </div>
                ) : (
                  <img
                    src="/assets/icons/x-circle.svg"
                    alt=""
                    width={18}
                    height={18}
                  />
                )}
              </td>
            </tr>
            {data?.errorMessage && (
              <tr className="tr-style">
                <td>Error Message</td>
                <td>{data?.errorMessage}</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
