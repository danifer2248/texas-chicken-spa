import { useState } from 'react'
import { FormContainer } from './FormContainer.jsx'
import { FormGroup } from './FormGroup.jsx'
import { PasswordField } from './PasswordField.jsx'

export function AuthPage({ page, redirectReason, onAuthenticate }) {
  const isRegister = page === 'register'
  const [values, setValues] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState({})

  const update = (field) => (event) => {
    const value = event.target.value
    setValues((current) => ({ ...current, [field]: value }))
    if (value.trim()) setErrors((current) => ({ ...current, [field]: '' }))
  }

  const submit = (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (isRegister && !values.name.trim()) nextErrors.name = 'Este campo es obligatorio.'
    if (!values.email.trim()) nextErrors.email = 'Este campo es obligatorio.'
    if (!values.password.trim()) nextErrors.password = 'Este campo es obligatorio.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    onAuthenticate(isRegister ? '¡Cuenta creada con éxito!' : '¡Inicio de sesión exitoso!')
  }

  return (
    <main className="main-container">
      <FormContainer
        title={isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
        notice={!isRegister ? redirectReason : ''}
        footer={(
          <>
            {isRegister ? '¿Ya tienes cuenta? ' : '¿No tienes cuenta? '}
            <a href={`${import.meta.env.BASE_URL}${isRegister ? 'login.html' : 'registro.html'}`}>
              {isRegister ? 'Inicia sesión' : 'Regístrate aquí'}
            </a>
          </>
        )}
      >
        <form onSubmit={submit} noValidate>
          {isRegister && (
            <FormGroup
              id="nombre"
              label="Nombre Completo"
              placeholder="Juan Pérez"
              value={values.name}
              onChange={update('name')}
              error={errors.name}
            />
          )}
          <FormGroup
            id={isRegister ? 'reg-email' : 'email'}
            label="Correo Electrónico"
            type="email"
            placeholder="tu@email.com"
            value={values.email}
            onChange={update('email')}
            error={errors.email}
          />
          <PasswordField
            id={isRegister ? 'reg-password' : 'password'}
            value={values.password}
            onChange={update('password')}
            error={errors.password}
          />
          {!isRegister && (
            <div className="form-options">
              <a
                href="#"
                className="forgot-link"
                onClick={(event) => {
                  event.preventDefault()
                  window.alert('Instrucciones enviadas a tu correo para restablecer la contraseña.')
                }}
              >
                ¿Olvidaste tu contraseña?
              </a>
            </div>
          )}
          <button type="submit" className="btn-submit">{isRegister ? 'Registrarse' : 'Ingresar'}</button>
        </form>
      </FormContainer>
    </main>
  )
}
