// components/Navbar.js
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '../src/contexts/AuthContext';
import styles from '../styles/Navbar.module.css';

export default function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const [hasScrolled, setHasScrolled] = useState(false);
    const [lastScrollY, setLastScrollY] = useState(0);
    const currentPath = usePathname();
    const { user, logout } = useAuth();

    const pages = [
        { name: 'AMA.OS', path: '/ama.os', delay: '0.2s' },
        { name: 'RELEASES', path: '/releases', delay: '0.3s' },
        { name: 'GALLERY', path: '/gallery', delay: '0.3s' },
        { name: 'CONTACT', path: '/contact', delay: '0.3s' },
    ];

    const toggleMenu = () => {
        setIsMenuOpen((prev) => !prev);
    };

    const isCurrent = (path) => currentPath === path;

    const controlNavbar = () => {
        if (typeof window !== 'undefined') {
            setHasScrolled(window.scrollY > 50);
            setIsVisible(window.scrollY < lastScrollY);
            setLastScrollY(window.scrollY);
        }
    };

    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.addEventListener('scroll', controlNavbar);
            return () => window.removeEventListener('scroll', controlNavbar);
        }
    }, [lastScrollY]);

    return (
        <div className={`${styles.nav} ${hasScrolled ? styles.nav_scrolled : styles.nav_transparent} ${isVisible ? styles.nav_visible : styles.nav_hidden}`}>
            <Link href="/">
                <Image
                    src="/LOGO WHITE.svg"
                    alt="AMA.OS"
                    width={0}
                    height={0}
                    className={styles.nav_logo}
                    priority={true}
                />
            </Link>
            <button className={`${styles.navButton} ${isMenuOpen ? styles.open : ''}`} onClick={toggleMenu}>
                <span className={styles.bar}></span>
                <span className={styles.bar}></span>
                <span className={styles.bar}></span>
            </button>
            <div className={`${styles.nav_list} ${isMenuOpen ? styles.active : ''}`} id="navMenu">
                <ul>
                    {pages.map((page, index) => (
                        <li key={index} style={{ '--delay': page.delay }}>
                            <Link
                                href={page.path}
                                className={isCurrent(page.path) ? styles.page_current : ''}
                                onClick={() => setIsMenuOpen(false)}
                            >
                                {page.name}
                            </Link>
                        </li>
                    ))}
                    {user ? (
                        <>
                            <li>
                                <span className={styles.userStatus}>
                                    Signed in as {user.displayName || user.email}
                                </span>
                            </li>
                            <li>
                                <Link href="/profile" onClick={() => setIsMenuOpen(false)}>
                                    Profile
                                </Link>
                            </li>
                            <li>
                                <button onClick={logout} className={styles.navbarButton}>
                                    Logout
                                </button>
                            </li>
                        </>
                    ) : (
                        <>
                            <li>
                                <Link href="/auth/login" onClick={() => setIsMenuOpen(false)}>
                                    Login
                                </Link>
                            </li>
                            <li>
                                <Link href="/auth/register" onClick={() => setIsMenuOpen(false)}>
                                    Register
                                </Link>
                            </li>
                        </>
                    )}
                </ul>
            </div>
        </div>
    );
}