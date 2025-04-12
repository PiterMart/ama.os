import Image from "next/image";
import styles from "./page.module.css";
import Form from "../../components/Form"

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Form/>
      </main>
      <footer className={styles.footer}>
      </footer>
    </div>
  );
}
