import { useState } from 'react'
import { FormContainer } from './FormContainer.jsx'
import { FormGroup } from './FormGroup.jsx'
import { PasswordField } from './PasswordField.jsx'
import { signIn, signUp } from '../lib/supabase.js'

export function AuthPage({ page, redirectReason, onAuthenticate }) {
  const isRegister = page === 'register'
  const [values, setValues] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const update = (field) => (event) => {
    const value = event.target.value
    setValues((current) => ({ ...current, [field]: value }))
    if (value.trim()) setErrors((current) => ({ ...current, [field]: '' }))
  }

  const submit = async (event) => {
    event.preventDefault()
    setNotice('')
    const nextErrors = {}
    if (isRegister && !values.name.trim()) nextErrors.name = 'Este campo es obligatorio.'
    if (!values.email.trim()) nextErrors.email = 'Este campo es obligatorio.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) nextErrors.email = 'Ingresa un correo válido.'
    if (!values.password) nextErrors.password = 'Este campo es obligatorio.'
    else if (values.password.length < 8) nextErrors.password = 'La contraseña debe tener al menos 8 caracteres.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setBusy(true)
    try {
      if (isRegister) {
        const result = await signUp({ name: values.name.trim(), email: values.email.trim(), password: values.password })
        if (result.session) onAuthenticate(result.session, '¡Tu cuenta fue creada correctamente!')
        else setNotice('Cuenta creada. Revisa tu correo para confirmar la dirección y luego inicia sesión.')
      } else {
        const session = await signIn({ email: values.email.trim(), password: values.password })
        onAuthenticate(session, '¡Inicio de sesión exitoso!')
      }
    } catch (error) {
      setNotice(error.message || 'No se pudo completar la autenticación. Verifica tus datos e inténtalo nuevamente.')
    } finally { setBusy(false) }
  }

  return (
    <main className="main-container">
      <FormContainer title={isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
        notice={[!isRegister ? redirectReason : '', notice].filter(Boolean).join(' ')}
        footer={<>{isRegister ? '¿Ya tienes cuenta? ' : '¿No tienes cuenta? '}<a href={`${import.meta.env.BASE_URL}${isRegister ? 'login.html' : 'registro.html'}`}>{isRegister ? 'Inicia sesión' : 'Regístrate aquí'}</a></>}>
        <form onSubmit={submit} noValidate>
          {isRegister && <FormGroup id="nombre" label="Nombre Completo" placeholder="Juan Pérez" value={values.name} onChange={update('name')} error={errors.name} />}
          <FormGroup id={isRegister ? 'reg-email' : 'email'} label="Correo Electrónico" type="email" placeholder="tu@email.com" value={values.email} onChange={update('email')} error={errors.email} />
          <PasswordField id={isRegister ? 'reg-password' : 'password'} value={values.password} onChange={update('password')} error={errors.password} />
          <button type="submit" className="btn-submit" disabled={busy}>{busy ? 'Procesando…' : isRegister ? 'Registrarse' : 'Ingresar'}</button>
        </form>
      </FormContainer>
    </main>
  )
}
