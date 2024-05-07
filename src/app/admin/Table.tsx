"use client";

import { Button, Space, Table, Upload } from "antd";
import {
  DownloadOutlined,
  HomeOutlined,
  ReloadOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { Users, download, read, update, upload } from "@/lib/excelActions";
import { useEffect, useState } from "react";

export default function UsersTable({ users }: { users?: Users[] }) {
  const [loading, setLoading] = useState(false);

  return (
    <Table
      dataSource={users}
      columns={[
        {
          title: "ФИО",
          dataIndex: "ФИО",
          width: "80%",
          sorter: (a, b) => a.ФИО.localeCompare(b.ФИО),
        },
        {
          title: "Ставка",
          dataIndex: "Ставка",
          width: "10%",
          sorter: (a, b) => a.Ставка - b.Ставка,
        },
        {
          title: "Нагрузка",
          dataIndex: "Нагрузка",
          width: "10%",
          sorter: (a, b) => a.Нагрузка - b.Нагрузка,
        },
      ]}
      rowKey={(x) => `${x.ФИО}-${x.Ставка}-${x.Нагрузка}`}
      pagination={false}
      title={() => (
        <Space>
          <Button icon={<HomeOutlined />} href="/">
            На главную
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => update()}>
            Перезагрузить
          </Button>
          <Upload
            accept=".xls, .xlsx"
            showUploadList={false}
            customRequest={async ({ file }) => {
              setLoading(true);
              const fd = new FormData();
              fd.append("file", file);
              await upload(fd);
              setLoading(false);
            }}
          >
            <Button
              icon={<UploadOutlined />}
              loading={loading}
              onClick={async () => {
                update();
              }}
            >
              Загрузить
            </Button>
          </Upload>
          <Button icon={<DownloadOutlined />} href="/admin/download">
            Скачать список
          </Button>
          <Button icon={<DownloadOutlined />} href="/admin/example">
            Пример файла
          </Button>
        </Space>
      )}
    />
  );
}
