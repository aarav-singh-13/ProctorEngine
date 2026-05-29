export default function RollNumberForm({ rollNumber, fullName, onRollChange, onNameChange, onSubmit, loading, disabled }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="form-group">
        <label htmlFor="rollNumber">Roll number</label>
        <input
          id="rollNumber"
          type="text"
          value={rollNumber}
          onChange={(e) => onRollChange(e.target.value.toUpperCase())}
          placeholder="e.g. CS001"
          required
          disabled={disabled || loading}
          autoComplete="off"
        />
      </div>

      <div className="form-group">
        <label htmlFor="fullName">Full name</label>
        <input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="As registered"
          required
          disabled={disabled || loading}
          autoComplete="name"
        />
      </div>

      <button type="submit" className="btn btn-primary" disabled={disabled || loading}>
        {loading ? 'Checking…' : 'Continue'}
      </button>
    </form>
  );
}
