---
title: "Contact"
description: "Get in touch with me for collaborations, projects, or just to say hello"
menu:
  main:
    weight: 50
---

# Get In Touch

I'd love to hear from you! Whether you have a project in mind, want to collaborate, or just want to say hello, feel free to reach out.

<form id="contactForm" class="contact-form">
    <div class="form-group">
        <label for="name">Name *</label>
        <input type="text" id="name" name="name" required>
    </div>
    
    <div class="form-group">
        <label for="email">Email *</label>
        <input type="email" id="email" name="email" required>
    </div>
    
    <div class="form-group">
        <label for="message">Message *</label>
        <textarea id="message" name="message" rows="6" required></textarea>
    </div>
    
    <button type="submit" class="btn-submit">Send Message</button>
</form>

<script src="/js/contact-form.js"></script>

<style>
.contact-form {
    max-width: 600px;
    margin: 2rem 0;
}

.form-group {
    margin-bottom: 1.5rem;
}

.form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: var(--text-primary, #1a202c);
}

.form-group input,
.form-group textarea {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid var(--border, #e2e8f0);
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.3s;
    font-family: inherit;
}

.form-group input:focus,
.form-group textarea:focus {
    outline: none;
    border-color: #667eea;
}

.btn-submit {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 0.75rem 2rem;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
}

.btn-submit:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
}

.btn-submit:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.form-message {
    padding: 1rem;
    border-radius: 8px;
    margin-top: 1rem;
    animation: slideIn 0.3s ease;
}

.form-message-success {
    background: #c6f6d5;
    color: #22543d;
    border: 1px solid #9ae6b4;
}

.form-message-error {
    background: #fed7d7;
    color: #742a2a;
    border: 1px solid #fc8181;
}

@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Dark mode support */
[data-theme="dark"] .form-group input,
[data-theme="dark"] .form-group textarea {
    background: var(--bg-secondary, #2d3748);
    color: var(--text-primary, #e2e8f0);
    border-color: var(--border, #4a5568);
}

[data-theme="dark"] .form-group input:focus,
[data-theme="dark"] .form-group textarea:focus {
    border-color: #9f7aea;
}
</style>