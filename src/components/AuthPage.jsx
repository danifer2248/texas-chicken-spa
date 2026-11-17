import { useState } from 'react'
import { FormContainer } from './FormContainer.jsx'
import { FormGroup } from './FormGroup.jsx'
import { PasswordField } from './PasswordField.jsx'
import { requireSupabase } from '../lib/supabase.js'

export function AuthPage({ page, redirectReason, onAuthenticated }) {
  const isRegister = page === 'register'
  const [values, setValues] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const update = (field) => (event) => {
    const value = event.target.value
    setValues((current) => ({ ...current, [field]: value }))
    if (value.trim()) setErrors((current) => ({ ...current, [field]: '' }))
    setFormError('')
    setNotice('')
  }

  const submit = async (event) => {
    event.preventDefault()
    if (submitting) return
    setFormError('')
    setNotice('')
    const nextErrors = {}
    if (isRegister && !values.name.trim()) nextErrors.name = 'Este campo es obligatorio.'
    if (!values.email.trim()) nextErrors.email = 'Este campo es obligatorio.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) nextErrors.email = 'Escribe un correo válido.'
    if (!values.password) nextErrors.password = 'Este campo es obligatorio.'
    else if (isRegister && values.password.length < 8) nextErrors.password = 'Usa una contraseña de al menos 8 caracteres.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setSubmitting(true)
    try {
      const client = requireSupabase()
      const result = isRegister
        ? await client.auth.signUp({
            email: values.email.trim(),
            password: values.password,
            options: {
              data: { full_name: values.name.trim() },
              emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
            },
          })
        : await client.auth.signInWithPassword({ email: values.email.trim(), password: values.password })

      if (result.error) throw result.error
      if (result.data.session) {
        onAuthenticated()
      } else if (isRegister) {
        setNotice('La cuenta no inició sesión automáticamente. Revisa en Supabase que la opción Confirm email esté desactivada para el proveedor Email.')
      } else {
        setNotice('No se inició sesión. Verifica que el correo y la contraseña sean correctos.')
      }
    } catch (error) {
      const message = error?.message || ''
      const errorCode = error?.code || ''
      if (errorCode === 'email_address_invalid' || /email address .* is invalid/i.test(message)) {
        setFormError('Supabase rechazó esta dirección de correo. Comprueba que esté escrita correctamente y que sea una cuenta real que pueda recibir correo. Si el error continúa con una dirección válida, consulta Authentication → Logs en Supabase.')
      } else if (/failed to fetch|networkerror|load failed/i.test(message)) {
        setFormError('No se recibió respuesta de Supabase. Comprueba la conexión y vuelve a intentarlo. Si continúa, revisa el detalle de la solicitud en las herramientas de red del navegador.')
      } else {
        setFormError(message || 'No se pudo completar la autenticación.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="main-container">
      <FormContainer
        title={isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
        notice={redirectReason || notice}
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
          {formError && <p className="login-alert data-error" role="alert">{formError}</p>}
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
          <button type="submit" className="btn-submit" disabled={submitting}>
            {submitting ? 'Conectando…' : isRegister ? 'Registrarse' : 'Ingresar'}
          </button>
        </form>
      </FormContainer>
    </main>
  )
}
