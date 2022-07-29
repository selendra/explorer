import { Avatar, Row, Table, Tooltip } from "antd";
import { Link } from "react-router-dom";
import { formatNumber, shortenAddress } from "../utils";

export default function AccountsTable({ short, loading, data, onChange }) {
  return (
    <Table
      pagination={
        short
          ? false
          : {
              pageSize: 10,
              total: data?.total_page,
              onChange: (page) => {
                onChange(page);
              },
            }
      }
      dataSource={data?.accounts}
      rowKey={(record) => record.accountId}
      loading={loading}
      className="table-styling"
      tableLayout="fixed"
    >
      <Table.Column
        title="Account"
        render={(text, record) =>
          record.identityDetail.identityDisplay ?
          <Tooltip placement="top" title={record.accountId}>
            <Link to={`/accounts/${record.accountId}`} className={short ? 'trim-string' : 'trim-string-long'}>
              <div className="address-bg">
                <p>{record.identityDetail.identityDisplay}</p>
              </div>
            </Link>
          </Tooltip>
          :
          <Link to={`/accounts/${record.accountId}`}>
            <div className="address-bg">
              <p>{shortenAddress(record.accountId)}</p>
            </div>
          </Link>
        }
      />
      { !short &&
        <Table.Column
          title="EVM Address"
          dataIndex=""
        />
      }
      <Table.Column
        title="Free Balance"
        dataIndex="freeBalance"
        render={(freeBalance) => <p>{formatNumber(freeBalance)} SEL</p>}
      />
      { !short &&
        <Table.Column
          title="Locked Balance"
          responsive={["md"]}
          dataIndex="lockedBalance"
          render={(lockedBalance) => <p>{formatNumber(lockedBalance)} SEL</p>}
        />
      }
      <Table.Column
        title="Available Balance"
        dataIndex="availableBalance"
        render={(availableBalance) => (
          <p>{formatNumber(availableBalance)} SEL</p>
        )}
      />
    </Table>
  );
}
