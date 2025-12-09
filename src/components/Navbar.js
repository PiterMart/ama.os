// components/Navbar.js
"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../src/contexts/AuthContext';
import styles from '../../styles/Navbar.module.css';

export default function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const [hasScrolled, setHasScrolled] = useState(false);
    const [lastScrollY, setLastScrollY] = useState(0);
    const [dragStart, setDragStart] = useState(null);
    const [dragOffset, setDragOffset] = useState(0);
    const [isDesktop, setIsDesktop] = useState(false);
    const currentPath = usePathname();
    const { user, logout, loading } = useAuth();
    const menuRef = useRef(null);
    const buttonRef = useRef(null);

    // Debug logs
    useEffect(() => {
        console.log('Navbar - Auth State:', { user, loading });
    }, [user, loading]);

    // Check if we're on desktop
    useEffect(() => {
        const checkDesktop = () => {
            setIsDesktop(window.innerWidth >= 768);
        };
        
        checkDesktop();
        window.addEventListener('resize', checkDesktop);
        
        return () => window.removeEventListener('resize', checkDesktop);
    }, []);

    const pages = [
        { name: 'AMA.OS', path: '/ama.os', delay: '1.8s' },
        { name: 'RELEASES', path: '/releases', delay: '1.9s' },
        { name: 'GALLERY', path: '/gallery', delay: '2s' },
        { name: 'CONTACT', path: '/contact', delay: '2.1s' },
    ];

    const toggleMenu = () => {
        setIsMenuOpen((prev) => !prev);
        setDragOffset(0);
    };

    const closeMenu = () => {
        setIsMenuOpen(false);
        setDragOffset(0);
    };

    const isCurrent = (path) => currentPath === path;

    const controlNavbar = () => {
        if (typeof window !== 'undefined') {
            setHasScrolled(window.scrollY > 50);
            setIsVisible(window.scrollY < lastScrollY);
            setLastScrollY(window.scrollY);
        }
    };

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isMenuOpen && 
                menuRef.current && 
                !menuRef.current.contains(event.target) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target)) {
                closeMenu();
            }
        };

        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isMenuOpen]);

    // Drag to close functionality
    const handleTouchStart = (e) => {
        if (!isMenuOpen) return;
        const touch = e.touches[0];
        setDragStart(touch.clientX);
    };

    const handleTouchMove = (e) => {
        if (!isMenuOpen || dragStart === null) return;
        const touch = e.touches[0];
        const currentX = touch.clientX;
        const diff = currentX - dragStart;
        
        // Only allow dragging to the left (negative values)
        if (diff < 0) {
            setDragOffset(diff);
        }
    };

    const handleTouchEnd = () => {
        if (!isMenuOpen || dragStart === null) return;
        
        // If dragged more than 100px to the left, close the menu instantly
        if (dragOffset < -100) {
            // Close immediately without animation
            setIsMenuOpen(false);
            setDragOffset(0);
        } else {
            // Reset position smoothly
            setDragOffset(0);
        }
        setDragStart(null);
    };

    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.addEventListener('scroll', controlNavbar);
            return () => window.removeEventListener('scroll', controlNavbar);
        }
    }, [lastScrollY]);

    if (loading) {
        return null; // or a loading spinner
    }

    // Determine transition based on device type and menu state
    const getTransitionStyle = () => {
        if (dragOffset !== 0) {
            return 'none';
        }
        if (isMenuOpen) {
            return 'left 0.85s ease';
        }
        // On desktop, use smooth transition when closing; on mobile, no transition
        return isDesktop ? 'left 0.85s ease' : 'none';
    };

    return (
        <div className={`${styles.nav} ${hasScrolled ? styles.nav_scrolled : styles.nav_transparent} ${isVisible ? styles.nav_visible : styles.nav_hidden}`}>
            {/* <Link href="/">
                <Image
                    src="/LOGO WHITE.png"
                    alt="AMA.OS"
                    width={70}
                    height={70}
                    className={styles.nav_logo}
                    priority={true}
                />
            </Link> */}
            <button 
                ref={buttonRef}
                className={`${styles.navButton} ${isMenuOpen ? styles.open : ''}`} 
                onClick={toggleMenu}
            >
                <span className={styles.bar}></span>
            </button>
            <div 
                ref={menuRef}
                className={`${styles.nav_list} ${isMenuOpen ? styles.active : ''}`} 
                id="navMenu"
                style={{
                    transform: dragOffset !== 0 ? `translateX(${dragOffset}px)` : 'none',
                    transition: getTransitionStyle()
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
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
                    {/* {user ? (
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
                        </>
                    )} */}
                </ul>
            </div>
        </div>
    );
}