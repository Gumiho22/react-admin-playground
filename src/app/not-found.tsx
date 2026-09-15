import Link from 'next/link';
import { Button, Result } from 'antd';

export default function NotFound() {
  return (
    <Result
      status="404"
      title="404"
      subTitle="你访问的地址没有对应的页面，请检查链接是否正确，或返回工作台继续操作。"
      extra={
        <Link href="/">
          <Button type="primary">返回工作台</Button>
        </Link>
      }
    />
  );
}
