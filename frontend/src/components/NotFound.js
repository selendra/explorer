import { Button } from "antd";
import React from "react";
import { Link } from "react-router-dom";

export default function NotFound({ error }) {
  return (
    <div className="notfound">
      <img alt="" src="/assets/images/404.svg" width={240} />

      <h3 style={{ paddingTop: "8px" }}>{error}</h3>

      <Button className="notfound-btn">
        <Link to="/">Back Home</Link>
      </Button>
    </div>
  );
}
