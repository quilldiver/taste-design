/** Shared QR controller is loaded once by RootLayout; each account is a real button. */
export default function WeChatTrigger({ account }: { account: string }) {
  return (
    <button
      type="button"
      className="wechat-trigger"
      data-wechat-trigger
      aria-expanded="false"
      aria-controls="wechat-qr-popover"
      aria-label={`显示 ${account} 的微信二维码`}
    >
      {account}
    </button>
  );
}
