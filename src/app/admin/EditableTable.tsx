"use client";

import { Users, updateRow, upload } from "@/lib/excelActions";
import {
  DownloadOutlined,
  HomeOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import type { TableProps } from "antd";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Space,
  Table,
  Typography,
  Upload,
} from "antd";
import React, { useEffect, useState } from "react";

interface EditableCellProps extends React.HTMLAttributes<HTMLElement> {
  editing: boolean;
  dataIndex: string;
  title: any;
  inputType: "number" | "text";
  record: Users;
  index: number;
  children: React.ReactNode;
}

const EditableCell: React.FC<
  EditableCellProps & { min?: number; step?: number }
> = ({
  editing,
  dataIndex,
  title,
  inputType,
  record,
  index,
  children,
  min,
  step,
  ...restProps
}) => {
  const inputNode =
    inputType === "number" ? <InputNumber min={min} step={step} /> : <Input />;

  return (
    <td {...restProps}>
      {editing ? (
        <Form.Item
          name={dataIndex}
          style={{ margin: 0 }}
          rules={[
            {
              required: true,
              message: `Please Input ${title}!`,
            },
          ]}
        >
          {inputNode}
        </Form.Item>
      ) : (
        children
      )}
    </td>
  );
};

const UsersTable = ({ users }: { users: Users[] }) => {
  const [form] = Form.useForm();
  const [data, setData] = useState(users);
  const [editingKey, setEditingKey] = useState("");
  const [loading, setLoading] = useState(false);

  const isEditing = (record: Users) => record.id === editingKey;

  const edit = (record: Partial<Users> & { id: React.Key }) => {
    form.setFieldsValue({ name: "", age: "", address: "", ...record });
    setEditingKey(record.id);
  };

  const cancel = () => {
    setEditingKey("");
  };

  const save = async (key: React.Key) => {
    try {
      const row = (await form.validateFields()) as Users;

      await updateRow({ ...row, id: key as string });

      const newData = [...data];
      const index = newData.findIndex((item) => key === item.id);
      if (index > -1) {
        const item = newData[index];
        newData.splice(index, 1, {
          ...item,
          ...row,
        });
        setData(newData);
        setEditingKey("");
      } else {
        newData.push(row);
        setData(newData);
        setEditingKey("");
      }
    } catch (errInfo) {
      console.error("Validate Failed:", errInfo);
    }
  };

  const columns = [
    {
      title: "ФИО",
      dataIndex: "ФИО",
      width: "65%",
      editable: true,
      sorter: (a: Users, b: Users) => a.ФИО.localeCompare(b.ФИО),
    },
    {
      title: "Ставка",
      dataIndex: "Ставка",
      width: "10%",
      editable: true,
      sorter: (a: Users, b: Users) => a.Ставка - b.Ставка,
    },
    {
      title: "Нагрузка",
      dataIndex: "Нагрузка",
      width: "10%",
      editable: true,
      sorter: (a: Users, b: Users) => a.Нагрузка - b.Нагрузка,
    },
    {
      title: "Действие",
      dataIndex: "operation",
      width: "15%",
      render: (_: any, record: Users) => {
        const editable = isEditing(record);
        return editable ? (
          <Space wrap>
            <Typography.Link
              onClick={() => save(record.id)}
              style={{ marginRight: 8 }}
            >
              Сохранить
            </Typography.Link>
            <Popconfirm title="Вы хотите отменить?" onConfirm={cancel}>
              <a>Отменить</a>
            </Popconfirm>
          </Space>
        ) : (
          <Typography.Link
            disabled={editingKey !== ""}
            onClick={() => edit(record)}
          >
            Редактировать
          </Typography.Link>
        );
      },
    },
  ];

  const mergedColumns: TableProps["columns"] = columns.map((col) => {
    if (!col.editable) {
      return col;
    }
    return {
      ...col,
      onCell: (record: Users) =>
        ({
          record,
          inputType: col.dataIndex === "ФИО" ? "text" : "number",
          min:
            col.dataIndex === "Ставка"
              ? 0.1
              : col.dataIndex === "Нагрузка"
              ? 10
              : undefined,
          step: col.dataIndex === "Ставка" ? 0.05 : undefined,
          dataIndex: col.dataIndex,
          title: col.title,
          editing: isEditing(record),
        } as EditableCellProps & { min?: number; step?: number }),
    };
  });

  return (
    <Form form={form} component={false}>
      <Table
        components={{
          body: {
            cell: EditableCell,
          },
        }}
        bordered
        dataSource={data}
        columns={mergedColumns}
        rowClassName="editable-row"
        pagination={false}
        rowKey={(x) => `${x.ФИО}-${x.Ставка}-${x.Нагрузка}`}
        title={() => (
          <Space>
            <Button icon={<HomeOutlined />} href="/">
              На главную
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
              <Button icon={<UploadOutlined />} loading={loading}>
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
    </Form>
  );
};

export default UsersTable;
