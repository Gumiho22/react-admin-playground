'use client';

import { App, Button, Card, Col, Flex, List, Row, Select, Switch, Tag, Typography } from 'antd';
import { RightOutlined, SettingOutlined } from '@ant-design/icons';

const BASIC = ['企业名称与 Logo', '主体认证资料', '默认时区 / 币种'];
const PERMISSIONS = ['角色与权限组', '数据可见范围', '操作审计日志'];
const NOTIFICATIONS = [
  { key: 'order', title: '订单状态变更提醒', desc: '订单支付、发货、退款时推送站内信', enabled: true },
  { key: 'stock', title: '库存预警推送', desc: '低于安全库存时通知采购负责人', enabled: true },
  { key: 'report', title: '日报 / 周报订阅', desc: '每天 09:00 推送昨日经营简报', enabled: false },
];
const OPEN_API = ['API 密钥管理', 'Webhook 回调', '第三方系统对接'];

/** 系统设置：antd Card / List / Switch / Select 组合，保存动作走 message 反馈 */
export function SettingsPanels() {
  const { message } = App.useApp();

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} xl={12}>
        <Card title="基础信息" extra={<Tag>待接入</Tag>}>
          <List
            split={false}
            dataSource={BASIC}
            renderItem={(item) => (
              <List.Item
                style={{ paddingInline: 0, cursor: 'pointer' }}
                onClick={() => message.info(`打开「${item}」配置（演示）`)}
              >
                <Flex align="center" gap={10} style={{ width: '100%' }}>
                  <SettingOutlined style={{ color: '#4f46e5' }} />
                  <Typography.Text style={{ flex: 1 }}>{item}</Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    未配置
                  </Typography.Text>
                  <RightOutlined style={{ fontSize: 12, color: 'rgba(0,0,0,0.25)' }} />
                </Flex>
              </List.Item>
            )}
          />
        </Card>
      </Col>

      <Col xs={24} xl={12}>
        <Card title="成员与权限" extra={<Tag>待接入</Tag>}>
          <List
            split={false}
            dataSource={PERMISSIONS}
            renderItem={(item) => (
              <List.Item
                style={{ paddingInline: 0, cursor: 'pointer' }}
                onClick={() => message.info(`打开「${item}」配置（演示）`)}
              >
                <Flex align="center" gap={10} style={{ width: '100%' }}>
                  <SettingOutlined style={{ color: '#4f46e5' }} />
                  <Typography.Text style={{ flex: 1 }}>{item}</Typography.Text>
                  <Tag color="default">默认策略</Tag>
                  <RightOutlined style={{ fontSize: 12, color: 'rgba(0,0,0,0.25)' }} />
                </Flex>
              </List.Item>
            )}
          />
        </Card>
      </Col>

      <Col xs={24} xl={12}>
        <Card
          title="消息通知"
          extra={
            <Select
              size="small"
              defaultValue="instant"
              style={{ width: 120 }}
              options={[
                { value: 'instant', label: '实时推送' },
                { value: 'digest', label: '合并推送' },
              ]}
            />
          }
        >
          <List
            split={false}
            dataSource={NOTIFICATIONS}
            renderItem={(item) => (
              <List.Item style={{ paddingInline: 0 }}>
                <Flex align="center" gap={12} style={{ width: '100%' }}>
                  <Flex vertical style={{ flex: 1, minWidth: 0 }}>
                    <Typography.Text>{item.title}</Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {item.desc}
                    </Typography.Text>
                  </Flex>
                  <Switch
                    defaultChecked={item.enabled}
                    onChange={(checked) =>
                      message.success(`「${item.title}」已${checked ? '开启' : '关闭'}（演示）`)
                    }
                  />
                </Flex>
              </List.Item>
            )}
          />
        </Card>
      </Col>

      <Col xs={24} xl={12}>
        <Card title="开放能力" extra={<Tag color="processing">Beta</Tag>}>
          <List
            split={false}
            dataSource={OPEN_API}
            renderItem={(item) => (
              <List.Item style={{ paddingInline: 0 }}>
                <Flex align="center" gap={10} style={{ width: '100%' }}>
                  <Typography.Text style={{ flex: 1 }}>{item}</Typography.Text>
                  <Button size="small" onClick={() => message.info(`生成「${item}」配置（演示）`)}>
                    配置
                  </Button>
                </Flex>
              </List.Item>
            )}
          />
        </Card>
      </Col>

      <Col span={24}>
        <Card>
          <Flex align="center" gap={12} wrap>
            <Typography.Text type="secondary">
              修改后的设置会先保存为草稿，确认无误后再发布到生产环境。
            </Typography.Text>
            <Flex gap={8} style={{ marginLeft: 'auto' }}>
              <Button onClick={() => message.info('已恢复上次保存的配置（演示）')}>重置</Button>
              <Button type="primary" onClick={() => message.success('设置已保存（演示）')}>
                保存更改
              </Button>
            </Flex>
          </Flex>
        </Card>
      </Col>
    </Row>
  );
}
