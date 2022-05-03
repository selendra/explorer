import { Row } from "antd";
import DataField from "./DataField";

export default function Overview(props) {
  return (
    <div className="home-all-data">
      <Row justify="center" align="middle" gutter={[8, 32]}>
        <DataField icon='/assets/icons/box.svg' title='Last Block' data={props.total_blocks} />
        <DataField icon='/assets/icons/box-tick.svg' title='Last Finalized' data={props.total_blocksFinalized} />
        <DataField icon='/assets/icons/edit.svg' title='Signed Extrinsics' data={new Intl.NumberFormat().format(props.total_extrinsicSigned)} />
        <DataField icon='/assets/icons/user-square.svg' title='Total Account' data={new Intl.NumberFormat().format(props.total_accounts)} />
        <DataField icon='/assets/icons/arrow-swap-horizontal.svg' title='Total Transfer' data={new Intl.NumberFormat().format(props.total_transfers)} />
        <DataField icon='/assets/icons/validator-white.svg' title='Total Validator' data={new Intl.NumberFormat().format(props.total_validators)} />
        <DataField icon='/assets/icons/profile-2user.svg' title='Total Issuance' data={new Intl.NumberFormat().format(props.total_issuance)} />
        <DataField icon='/assets/icons/box-time.svg' title='Total Stake' data={new Intl.NumberFormat().format(props.total_staking)} />
      </Row>
    </div>
  );
}


