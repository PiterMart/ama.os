"use client";

import AuthForm from '../../../components/AuthForm';
import styles from '../../../../styles/Auth.module.css';

export default function LoginPage() {
  return (
    <div className={styles.authContainer}>
      <div className={styles.authBox}>
        <h1 className={styles.authTitle}>Login</h1>
        <AuthForm isLogin={true} />
      </div>
    </div>
  );
} 