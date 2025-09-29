import { useState } from 'react';

const Login = ({ onLogin }) => {
    const [nickname, setNickname] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (nickname.trim()) {
            onLogin({
                nickname: nickname.trim(),
                id: Date.now() // 임시 ID (실제로는 서버에서 생성)
            });
        }
    };

    return (
        <div style={{
            maxWidth: '400px',
            margin: '50px auto',
            padding: '30px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            backgroundColor: '#fff'
        }}>
            <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>로그인</h2>

            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '20px' }}>
                    <label htmlFor="nickname" style={{ display: 'block', marginBottom: '8px' }}>
                        닉네임:
                    </label>
                    <input
                        type="text"
                        id="nickname"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="닉네임을 입력하세요"
                        style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            fontSize: '16px'
                        }}
                        required
                    />
                </div>

                <button
                    type="submit"
                    style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '16px',
                        cursor: 'pointer'
                    }}
                >
                    로그인
                </button>
            </form>
        </div>
    );
};

export default Login;