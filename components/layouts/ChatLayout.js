// layouts/ChatLayout.js
import ChatModal from "../../components/ChatModal";

const ChatLayout = ({ children, user }) => {
  return (
    <div>
      {user && <ChatModal />}
      {children}
    </div>
  );
};

export default ChatLayout;